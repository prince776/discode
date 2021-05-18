import React, { RefObject, useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import Editor from '../components/editor';
import { languageToEditorMode } from '../config/mappings';
import API from '../utils/API';
import { debounce } from '../utils/utils';
import SplitPane from 'react-split-pane';

import socket from './../utils/socket';
import { baseURL } from '../config/config';
import { useRef } from 'react';
import Peer from 'peerjs';

interface RoomProps {
    updatePreviousRooms: (room: string) => any;
}

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

    const myAudio = useRef<HTMLVideoElement>(null);
    const remoteAudio = useRef<HTMLVideoElement>(null);
    const [remoteAudios, setRemoteAudios] = useState<{ [userId: string]: HTMLVideoElement }>({});
    const myPeer = new Peer();

    const addAudioStream = (stream: MediaStream) => {
        console.log('Added stream');
        let video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        video.addEventListener('ended', () => {
            console.log('removing');
            video.remove();
        });
    };

    const connectP2P = (userId: string, stream: MediaStream) => {
        const call = myPeer.call(userId, stream);

        call.on('stream', (userStream) => {
            console.log('peeeer:', userId);
            addAudioStream(userStream);
        });
    };

    useEffect(() => {
        const id = props.match.params.id;
        setId(id);

        myPeer.on('open', (userId) => {
            socket.emit('joinroom', { roomId: id, userId });
        });
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

        socket.on('userleft', () => {
            console.log('user disconnected');
        });
        navigator.mediaDevices
            .getUserMedia({
                audio: true
            })
            .then((stream) => {
                if (myAudio.current) myAudio.current.srcObject = stream;

                socket.on('userjoined', (userId) => {
                    connectP2P(userId, stream);
                });

                myPeer.on('call', (call) => {
                    call.answer(stream);
                    call.on('stream', (userStream) => {
                        console.log('peer ', call.peer);
                        addAudioStream(userStream);
                    });
                });
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
            })
            .catch((err) => {
                props.history.push('/404');
            });

        window.addEventListener('resize', () => setWindowWidth(window.innerWidth));
    }, [props]);

    useEffect(() => {
        if (submissionCheckerId && submissionStatus == compeletedStatus) {
            clearInterval(submissionCheckerId);
            setSubmissionCheckerId(null);

            const params = new URLSearchParams({
                id: submissionId,
                api_key: 'guest'
            });
            const querystring = params.toString();
            API.get(`http://api.paiza.io/runners/get_details?${querystring}`).then((res) => {
                const { stdout, stderr, build_stderr } = res.data;
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
        API.post(`http://api.paiza.io/runners/create?${querystring}`)
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
        API.get(`http://api.paiza.io/runners/get_status?${querystring}`).then((res) => {
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

    return (
        <div>
            <video
                muted
                autoPlay
                ref={myAudio}
                style={{
                    display: 'none'
                }}
            />
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
                            navigator.clipboard.writeText(`${baseURL}/room/${id}`);
                        }}
                    >
                        Copy room link
                    </button>
                </div>
                <div className="form-group col">
                    <br />
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submissionStatus === runningStatus}
                    >
                        Save and Run
                    </button>
                </div>
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
                    <div className="row">
                        <h5 className="col">Code Here</h5>
                        <button
                            className="btn col-l-2 col-md-3 mx-3 mb-1 btn-secondary float-right"
                            onClick={() => {
                                navigator.clipboard.writeText(body);
                            }}
                        >
                            Copy Code
                        </button>
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
