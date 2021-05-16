import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import Editor from '../components/editor';
import { languageToEditorMode } from '../config/mappings';
import API from '../utils/API';

import socket from './../utils/socket';

const Room: React.FC<RouteComponentProps<any>> = (props) => {
    const [id, setId] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [body, setBody] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');

    const languages = Object.keys(languageToEditorMode);
    const themes = ['monokai', 'github', 'solarized_dark', 'dracula'];

    const [language, setLanguage] = useState<string>('');
    const [theme, setTheme] = useState<string>('monokai');

    const idleStatus = 'Idle';
    const runningStatus = 'running';
    const compeletedStatus = 'completed';
    const errorStatus = 'Some error occured';

    const [submissionStatus, setSubmissionStatus] = useState<string>(idleStatus);
    const [submissionId, setSubmissionId] = useState<string>('');

    const [submissionCheckerId, setSubmissionCheckerId] = useState<NodeJS.Timeout | null>(null);

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
                setTitle(title);
                setBody(body);
                setInput(input);
                if (language) setLanguage(language);
            })
            .catch((err) => {
                props.history.push('/404');
            });
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
                const { stdout, stderr } = res.data;
                socket.emit('updateOutput', { value: `${stdout}${stderr}`, roomId: id });
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
        socket.emit('updateBody', { value, roomId: id });
    };

    const handleUpdateInput = (value: string) => {
        socket.emit('updateInput', { value, roomId: id });
    };

    return (
        <div>
            <div className="row container-fluid">
                <div className="form-group col-4">
                    <label>Choose Language</label>
                    <select
                        className="form-select"
                        onChange={(event) =>
                            socket.emit('updateLanguage', { value: event.target.value, roomId: id })
                        }
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
                <div className="form-group col-4">
                    <label>Choose Theme</label>
                    <select
                        className="form-select"
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
                <div className="form-group col-2">
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
            <div className="row p-0 m-0 text-center">
                <div className="col-6">
                    <h5>Code Here</h5>
                    <Editor
                        theme={theme}
                        // @ts-ignore
                        language={languageToEditorMode[language]}
                        body={body}
                        setBody={handleUpdateBody}
                    />
                </div>
                <div className="col-6 text-center">
                    <h5>Input</h5>
                    <Editor
                        theme={theme}
                        language={''}
                        body={input}
                        setBody={handleUpdateInput}
                        height={'35vh'}
                    />
                    <h5>Output</h5>
                    <Editor
                        theme={theme}
                        language={''}
                        body={output}
                        setBody={setOutput}
                        readOnly={true}
                        height={'40vh'}
                    />
                </div>
            </div>
        </div>
    );
};

export default withRouter(Room);
