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
import { diff_match_patch } from 'diff-match-patch';

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
    const fontSizes = ['8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32'];
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
    const [fontSize, setFontSize] = useState<string>(localStorage.getItem('fontSize') ?? '12');

    const idleStatus = 'Idle';
    const runningStatus = 'running';
    const compeletedStatus = 'completed';
    const errorStatus = 'Some error occured';

    const [submissionStatus, setSubmissionStatus] = useState<string>(idleStatus);
    const [submissionId, setSubmissionId] = useState<string>('');

    const [submissionCheckerId, setSubmissionCheckerId] = useState<NodeJS.Timeout | null>(null);

    const [inAudio, setInAudio] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    const dmp = new diff_match_patch();

    useEffect(() => {
        socket.off('userjoined');
        socket.on('userjoined', () => {
            socket.emit('setBody', { value: body, roomId: id });
            socket.emit('setLanguage', { value: language, roomId: id });
            socket.emit('setInput', { value: input, roomId: id });
            socket.emit('setOutput', { value: output, roomId: id });
        });
    }, [body, language, input, output]);

    useEffect(() => {
        socket.off('updateBody');
        socket.on('updateBody', (patch) => {
            const [newBody, res] = dmp.patch_apply(patch, body);
            if (res[0]) setBody(newBody);
            else console.log('Failed', body, patch);
        });
    }, [body]);

    useEffect(() => {
        socket.off('updateInput');
        socket.on('updateInput', (patch) => {
            const [newInput, res] = dmp.patch_apply(patch, input);
            if (res[0]) setInput(newInput);
            else console.log('Failed', body, patch);
        });
    }, [input]);

    useEffect(() => {
        const id = props.match.params.id;
        setId(id);
        socket.emit('joinroom', id);

        API.get(`/api/room/${id}`)
            .then((res) => {
                const { title, body, language, input } = res.data.data;
                if (title) {
                    setTitle(title);
                    document.title = `Discode: ${title}`;
                    props.updatePreviousRooms(`${id}!${title}`);
                }
                setBody(body ?? '');
                setInput(input ?? '');
                if (language) setLanguage(language);
                console.log(language);
            })
            .catch((err) => {
                props.history.push('/404');
            });
        return () => {
            if (myPeer) {
                socket.emit('leaveAudioRoom', myPeer.id);
                destroyConnection();
            }
            myAudio = null;
            socket.emit('leaveroom', id);
        };
    }, [props.match.params.id]);

    useEffect(() => {
        socket.on('setBody', (body) => {
            setBody(body);
        });
        socket.on('setInput', (input) => {
            setInput(input);
        });
        socket.on('setLanguage', (language) => {
            setLanguage(language);
        });
        socket.on('setOutput', (output) => {
            setOutput(output);
        });

        const resizeCallback = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', resizeCallback);

        return () => {
            window.removeEventListener('resize', resizeCallback);
        };
    }, []);

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
                socket.emit('setOutput', { value: output, roomId: id });
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

        const params = {
            source_code: body,
            language: language,
            input: input,
            api_key: 'guest'
        };
        API.post(`https://api.paiza.io/runners/create`, params)
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
        const patch = dmp.patch_make(body, value);
        setBody(value);
        debounce(() => socket.emit('updateBody', { value: patch, roomId: id }), 100)();
    };

    const handleUpdateInput = (value: string) => {
        const patch = dmp.patch_make(input, value);
        setInput(value);
        debounce(() => socket.emit('updateInput', { value: patch, roomId: id }), 100)();
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

    useEffect(() => {
        localStorage.setItem('fontSize', fontSize);
    }, [fontSize]);

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
                <div className="form-group col-lg-2 col-md-3">
                    <label>Choose Language</label>
                    <select
                        className="form-select"
                        defaultValue={language}
                        onChange={(event) => {
                            setLanguage(event.target.value);
                            socket.emit('setLanguage', {
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
                <div className="form-group col-lg-2 col-md-3">
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
                <div className="form-group col-lg-2 col-md-3">
                    <label>Font Size</label>
                    <select
                        className="form-select"
                        defaultValue={fontSize}
                        onChange={(event) => setFontSize(event.target.value)}
                    >
                        {fontSizes.map((fontSize, index) => {
                            return (
                                <option key={index} value={fontSize}>
                                    {fontSize}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div className="form-group col-lg-2 col-md-3">
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
                <div className="form-group col-lg-2 col-md-2">
                    <br />
                    <button
                        className={`btn btn-${inAudio ? 'primary' : 'secondary'}`}
                        onClick={() => setInAudio(!inAudio)}
                    >
                        {inAudio ? 'Leave Audio' : 'Join Audio'} Room
                    </button>
                </div>
                {inAudio ? (
                    <div className="form-group col-lg-1 col-md-2">
                        <br />
                        <button
                            className={`btn btn-${!isMuted ? 'primary' : 'secondary'}`}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? 'Muted' : 'Speaking'}
                        </button>
                    </div>
                ) : (
                    <div className="form-group col-lg-1 col-md-2" />
                )}

                <div className="form-group col-lg-1 col-md-2">
                    <br />
                    <label>Status: {submissionStatus}</label>
                </div>
            </div>

            <hr />
            <SplitPane
                split="vertical"
                minSize={150}
                maxSize={windowWidth - 150}
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
                        fontSize={fontSize}
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
                        fontSize={fontSize}
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
                        fontSize={fontSize}
                    />
                </div>
            </SplitPane>
        </div>
    );
};

export default withRouter(Room);
