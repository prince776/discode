import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import Editor from '../components/editor';
import { languageToEditorMode } from '../config/mappings';
import API from '../utils/API';
import { debounce } from '../utils/utils';
import SplitPane from 'react-split-pane';

import socket from './../utils/socket';
import { baseURL } from '../config/config';
import Peer from 'peerjs';

interface RoomProps {
    updatePreviousRooms: (room: string) => any;
}

var myPeer: Peer;
var audios: { [id: string]: { id: string; stream: MediaStream } } = {};
var peers: { [id: string]: Peer.MediaConnection } = {};
var myAudio: MediaStream | null;

// Audio rooms work fine for the most part, except for the asynchrousity caused by hooks that sometimes leads
// to trying to destroy an already destoyed thing, or when we were in process of it.
// So yeah, something to work on #TODO

const Room: React.FC<RouteComponentProps<any> & RoomProps> = (props) => {
    const [id, setId] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [body, setBody] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');

    const [widthLeft, setWidthLeft] = useState<string>('');
    const [widthRight, setWidthRight] = useState<string>('');
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    const languages = Object.keys(languageToEditorMode);
    const themes = [
        'monokai',
        'github',
        'solarized_dark',
        'dracula',
        'eclipse',
        'tomorrow_night',
        'tomorrow_night_blue',
        'xcode',
        'ambiance',
        'solarized_light'
    ].sort();

    const [language, setLanguage] = useState<string>(localStorage.getItem('language') ?? 'c');
    const [theme, setTheme] = useState<string>(localStorage.getItem('theme') ?? 'monokai');

    const idleStatus = 'Idle';
    const runningStatus = 'running';
    const compeletedStatus = 'completed';
    const errorStatus = 'Some error occured';

    const [submissionStatus, setSubmissionStatus] = useState<string>(idleStatus);
    const [submissionId, setSubmissionId] = useState<string>('');

    const [submissionCheckerId, setSubmissionCheckerId] = useState<NodeJS.Timeout | null>(null);

    const [inAudio, setInAudio] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    useEffect(() => {
        const id = props.match.params.id;
        setId(id);

        socket.emit('joinroom', id);
        socket.on('updateBody', (body) => {
            setBody(body);
        });
        socket.on('updateInput', (input) => {
            setInput(input);
        });
        socket.on('updateLanguage', (language) => {
            setLanguage(language);
        });
        socket.on('updateOutput', (output) => {
            setOutput(output);
        });

        API.get(`/api/room/${id}`)
            .then((res) => {
                const { title, body, language, input } = res.data.data;
                if (title) {
                    setTitle(title);
                    document.title = `Discode: ${title}`;
                    props.updatePreviousRooms(`${id}-${title}`);
                }
                setBody(body ?? '');
                setInput(input ?? '');
                if (language) setLanguage(language);
                console.log(language);
            })
            .catch((err) => {
                props.history.push('/404');
            });

        window.addEventListener('resize', () => setWindowWidth(window.innerWidth));

        return () => {
            console.log('called');
            if (myPeer) {
                socket.emit('leaveAudioRoom', myPeer.id);
                destroyConnection();
            }
            myAudio = null;
        };
    }, [props]);

    useEffect(() => {
        setInAudio(false);
    }, [id]);

    useEffect(() => {
        if (submissionCheckerId && submissionStatus == compeletedStatus) {
            clearInterval(submissionCheckerId);
            setSubmissionCheckerId(null);

            const params = new URLSearchParams({
                id: submissionId,
                api_key: 'guest'
            });
            const querystring = params.toString();
            API.get(`https://api.paiza.io/runners/get_details?${querystring}`).then((res) => {
                const { stdout, stderr, build_stderr } = res.data;
                console.log(res.data);
                let output = '';
                if (stdout) output += stdout;
                if (stderr) output += stderr;
                if (build_stderr) output += build_stderr;
                setOutput(output);
                socket.emit('updateOutput', { value: output, roomId: id });
            });
        }
    }, [submissionStatus]);

    const handleSubmit = () => {
        if (submissionStatus === runningStatus) return;
        setSubmissionStatus(runningStatus);

        API.patch(`/api/room/${id}`, { title, body, input, language })
            .then()
            .catch((err) => {
                setSubmissionStatus(errorStatus);
                return;
            });

        const params = new URLSearchParams({
            source_code: body,
            language: language,
            input: input,
            api_key: 'guest'
        });
        const querystring = params.toString();
        API.post(`https://api.paiza.io/runners/create?${querystring}`)
            .then((res) => {
                const { id, status } = res.data;
                setSubmissionId(id);
                setSubmissionStatus(status);
            })
            .catch((err) => {
                setSubmissionId('');
                setSubmissionStatus(errorStatus);
            });
    };

    useEffect(() => {
        if (submissionId) {
            setSubmissionCheckerId(setInterval(() => updateSubmissionStatus(), 1000));
        }
    }, [submissionId]);

    const updateSubmissionStatus = () => {
        const params = new URLSearchParams({
            id: submissionId,
            api_key: 'guest'
        });
        const querystring = params.toString();
        API.get(`https://api.paiza.io/runners/get_status?${querystring}`).then((res) => {
            const { status } = res.data;
            setSubmissionStatus(status);
        });
    };

    const handleUpdateBody = (value: string) => {
        setBody(value);
        debounce(() => socket.emit('updateBody', { value, roomId: id }), 100)();
    };

    const handleUpdateInput = (value: string) => {
        setInput(value);
        debounce(() => socket.emit('updateInput', { value, roomId: id }), 100)();
    };

    const handleWidthChange = (x: number) => {
        setWidthRight((100 - x).toString());
        setWidthLeft(x.toString());
    };

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    // Voice room stuff

    const getAudioStream = () => {
        const myNavigator =
            navigator.mediaDevices.getUserMedia ||
            // @ts-ignore
            navigator.mediaDevices.webkitGetUserMedia ||
            // @ts-ignore
            navigator.mediaDevices.mozGetUserMedia ||
            // @ts-ignore
            navigator.mediaDevices.msGetUserMedia;
        return myNavigator({ audio: true });
    };

    const createAudio = (data: { id: string; stream: MediaStream }) => {
        const { id, stream } = data;
        if (!audios[id]) {
            const audio = document.createElement('audio');
            audio.id = id;
            audio.srcObject = stream;
            if (myPeer && id == myPeer.id) {
                myAudio = stream;
                audio.muted = true;
            }
            audio.autoplay = true;
            audios[id] = data;
            console.log('Adding audio: ', id);
        } // } else {
        //     console.log('adding audio: ', id);
        //     // @ts-ignore
        //     document.getElementById(id).srcObject = stream;
        // }
    };

    const removeAudio = (id: string) => {
        delete audios[id];
        const audio = document.getElementById(id);
        if (audio) audio.remove();
    };

    const destroyConnection = () => {
        console.log('distroying', audios, myPeer.id);
        if (audios[myPeer.id]) {
            const myMediaTracks = audios[myPeer.id].stream.getTracks();
            myMediaTracks.forEach((track) => {
                track.stop();
            });
        }
        if (myPeer) myPeer.destroy();
    };

    const setPeersListeners = (stream: MediaStream) => {
        myPeer.on('call', (call) => {
            call.answer(stream);
            call.on('stream', (userAudioStream) => {
                createAudio({ id: call.metadata.id, stream: userAudioStream });
            });
            call.on('close', () => {
                removeAudio(call.metadata.id);
            });
            call.on('error', () => {
                console.log('peer error');
                if (!myPeer.destroyed) removeAudio(call.metadata.id);
            });
            peers[call.metadata.id] = call;
        });
    };

    const newUserConnection = (stream: MediaStream) => {
        socket.on('userJoinedAudio', (userId) => {
            const call = myPeer.call(userId, stream, { metadata: { id: myPeer.id } });
            call.on('stream', (userAudioStream) => {
                createAudio({ id: userId, stream: userAudioStream });
            });
            call.on('close', () => {
                removeAudio(userId);
            });
            call.on('error', () => {
                console.log('peer error');
                if (!myPeer.destroyed) removeAudio(userId);
            });
            peers[userId] = call;
        });
    };

    useEffect(() => {
        if (inAudio) {
            myPeer = new Peer();
            myPeer.on('open', (userId) => {
                console.log('opened');
                getAudioStream().then((stream) => {
                    socket.emit('joinAudioRoom', id, userId);
                    stream.getAudioTracks()[0].enabled = !isMuted;
                    newUserConnection(stream);
                    setPeersListeners(stream);
                    createAudio({ id: myPeer.id, stream });
                });
            });
            myPeer.on('error', (err) => {
                console.log('peerjs error: ', err);
                if (!myPeer.destroyed) myPeer.reconnect();
            });
            socket.on('userLeftAudio', (userId) => {
                console.log('user left aiudio:', userId);
                if (peers[userId]) peers[userId].close();
                removeAudio(userId);
            });
        } else {
            console.log('leaving', myPeer);
            if (myPeer) {
                socket.emit('leaveAudioRoom', myPeer.id);
                destroyConnection();
            }
            myAudio = null;
        }
    }, [inAudio]);

    useEffect(() => {
        if (inAudio) {
            if (myAudio) {
                myAudio.getAudioTracks()[0].enabled = !isMuted;
            }
        }
    }, [isMuted]);

    return (
        <div>
            <div className="row container-fluid text-center justify-content-center">
                <div className="form-group col-3">
                    <label>Choose Language</label>
                    <select
                        className="form-select"
                        defaultValue={language}
                        onChange={(event) => {
                            setLanguage(event.target.value);
                            socket.emit('updateLanguage', {
                                value: event.target.value,
                                roomId: id
                            });
                        }}
                    >
                        {languages.map((lang, index) => {
                            return (
                                <option key={index} value={lang} selected={lang == language}>
                                    {lang}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div className="form-group col-3">
                    <label>Choose Theme</label>
                    <select
                        className="form-select"
                        defaultValue={theme}
                        onChange={(event) => setTheme(event.target.value)}
                    >
                        {themes.map((theme, index) => {
                            return (
                                <option key={index} value={theme}>
                                    {theme}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div className="form-group col">
                    <br />
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                        }}
                    >
                        Copy room link
                    </button>
                </div>
                <div className="form-group col">
                    <br />
                    <button
                        className={`btn btn-${inAudio ? 'primary' : 'secondary'}`}
                        onClick={() => setInAudio(!inAudio)}
                    >
                        {inAudio ? 'Leave Audio' : 'Join Audio'} Room
                    </button>
                </div>
                {inAudio ? (
                    <div className="form-group col">
                        <br />
                        <button
                            className={`btn btn-${!isMuted ? 'primary' : 'secondary'}`}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? 'Muted' : 'Speaking'}
                        </button>
                    </div>
                ) : (
                    <div className="form-group col" />
                )}

                <div className="form-group col-2">
                    <br />
                    <label>Status: {submissionStatus}</label>
                </div>
            </div>

            <hr />
            <SplitPane
                split="vertical"
                minSize={200}
                maxSize={windowWidth - 200}
                defaultSize={windowWidth / 2}
                className="row text-center "
                style={{ height: '78vh', width: '100vw', marginRight: '0' }}
                onChange={handleWidthChange}
            >
                <div>
                    <div className="row mb-1">
                        <h5 className="col">Code Here</h5>

                        <div className="form-group col">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(body);
                                }}
                            >
                                Copy Code
                            </button>
                        </div>
                        <div className="form-group col">
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={submissionStatus === runningStatus}
                            >
                                Save and Run
                            </button>
                        </div>
                    </div>
                    <Editor
                        theme={theme}
                        width={widthLeft}
                        // @ts-ignore
                        language={languageToEditorMode[language]}
                        body={body}
                        setBody={handleUpdateBody}
                    />
                </div>
                <div className="text-center">
                    <h5>Input</h5>
                    <Editor
                        theme={theme}
                        language={''}
                        body={input}
                        setBody={handleUpdateInput}
                        height={'35vh'}
                        width={widthRight}
                    />
                    <h5>Output</h5>
                    <Editor
                        theme={theme}
                        language={''}
                        body={output}
                        setBody={setOutput}
                        readOnly={true}
                        height={'39vh'}
                        width={widthRight}
                    />
                </div>
            </SplitPane>
        </div>
    );
};

export default withRouter(Room);
