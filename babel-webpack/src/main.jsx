'use strict';

import { Config } from "aws-sdk";
import { CognitoUserPool, AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import React from "react";
import ReactDOM from "react-dom";
import appConfig from "./config";
import rest from './rest';

class SignUpForm extends React.Component {
    state = {
        email: "",
        password: ""
    }

    handleSubmit(e) {
        e.preventDefault();
        const email = this.state.email.trim();
        const password = this.state.password.trim();
        Config.region = appConfig.region;
        const authDetails = new AuthenticationDetails({ UserName: email, Password: password });
        const userPool = new CognitoUserPool({
            UserPoolId: appConfig.UserPoolId,
            ClientId: appConfig.ClientId,
        });
        const user = new CognitoUser({ Username: email, Pool: userPool });
        this.props.onAuthenticating(email);
        user.authenticateUser(authDetails, {
            onSuccess: (session, userConfigurationNecessary) => {
                this.props.onLoggedIn(session.getIdToken().getJwtToken(), session.getRefreshToken().getToken());
            },
            onFailure: err => {
                this.props.onLoginFailure(err);
            }
        });
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit.bind(this)}>
                <input style={{margin: '0.2em' }} type="text"
                    value={this.state.email}
                    placeholder="Email"
                    onChange={evt => this.setState({ email: evt.target.value })} />
                <input style={{margin: '0.2em' }} type="password"
                    value={this.state.password}
                    placeholder="Password"
                    onChange={evt => this.setState({ password: evt.target.value })} />
                <input style={{margin: '0.2em' }} type="submit" value="Sign-in" />
            </form>
        );
    }
}

class ModellerClient extends React.Component {
    state = {
        status: "Ready...",
        responseDisplay: "hidden",
        postData:
`{
    "settings": {
        "classifications": [
            "cash",
            "security",
            "assetClass"
        ],
        "tolerance": 1e-6,
        "cash": {
            "cash": "<all>"
        }
    },
    "master": {
        "data": {
            "GBP": {
                "cash": "GBP"
            },
            "STOCK1": {
                "security": "STOCK1",
                "assetClass": "equity",
                "rounding": 1
            },
            "STOCK2": {
                "security": "STOCK2",
                "assetClass": "equity",
                "rounding": 1
            }
        }
    },
    "portfolios": {
        "data": {
            "portfolio1": {
                "data": {
                    "GBP": {
                        "holding": 40
                    },
                    "STOCK1": {
                        "holding": 130
                    }
                }
            }
        }
    },
    "instructions": {
        "symbols": {
        },
        "portfolios": {
        },
        "rules": {
        }
    },
    "terms": {
        "data": {
            "general": {
                "buyCharge": 0,
                "sellCharge": 0,
                "classes": [
                ],
                "symbols": {
                }
            },
            "portfolios": {
            }
        }
    },
    "models": {
        "data": {
            "model1": {
                "data": {
                    "STOCK1": {
                        "security": "STOCK1",
                        "weight": 0.5,
                        "operator": "->",
                        "default": "STOCK1"
                    },
                    "STOCK2": {
                        "security": "STOCK2",
                        "weight": 0.5,
                        "operator": "->",
                        "default": "STOCK2"
                    }
                }
            }
        }
    },
    "sessions": {
        "session1": {
            "portfolio": "portfolio1",
            "model": "model1"
        }
    },
    "rules": {
        "data": {
        }
    },
    "valuation": {
        "data": {
            "GBP": 1,
            "STOCK1": 0.7,
            "STOCK2": 3.5
        }
    }
}`
    }

    onPost() {
        this.setState({status: "Calling service..."});
        rest('POST', 'https://api.portfolio-modelling.com/v1/balance', this.state.postData, {
            Authorization: "Bearer " + this.props.idToken,
            'Content-Type': "application/json",
            "Accept": "application/json"
        })
        .then(response => {
            this.setState({
                status: "Ready...",
                responseDisplay: "block",
                responseData: response
            })
        })
        .catch(err => {
            alert("Network error: " + err.message);
            this.setState({
                status: "Error"
            });
        })
    }

    render() {
        return (
            <div style={{display: "flex", flexDirection: "column" }}>
                <h2>{this.state.status}</h2>
                <textarea rows={15} cols={80} value={this.state.postData} onChange={evt=>this.setState({postData: evt.target.value})} />
                <button style={{ alignSelf: 'flex-start', 'margin': '0.5em' }} onClick={evt=>this.onPost()}>Send</button>
                <textarea readOnly={true} style={{display: this.state.responseDisplay}} rows={15} cols={80} value={this.state.responseData} />
            </div>
        )
    }
}

class App extends React.Component {
    state = {
        loggedIn: "NO",
        email: "",
        error: null
    }

    onAuthenticating(email) {
        this.setState({
            loggedIn: "BUSY",
            email: email,
            error: null
        });
    }

    onLoggedIn(idToken, refreshToken) {
        this.setState({
            loggedIn: "YES",
            idToken: idToken,
            refreshToken: refreshToken
        });
    }

    onLoginFailure(err) {
        this.setState({
            loggedIn: "NO",
            error: err
        })
    }

    renderMain() {
        switch(this.state.loggedIn) {
            case "NO":
                return (
                    <SignUpForm onAuthenticating={email => this.onAuthenticating(email) } onLoggedIn={(idToken,refreshToken) => this.onLoggedIn(idToken, refreshToken) } onLoginFailure={ err => this.onLoginFailure(err)} />
                );
            case "BUSY":
                return (
                    <p>Logging {this.state.email} in...</p>
                );
            case "YES":
                return (
                    <div>
                        <p>Logged in as {this.state.email}</p>
                        <ModellerClient idToken={this.state.idToken} refreshToken={this.state.refreshToken} />
                    </div>
                );
            default:
                return (
                    <p>Unknown status</p>
                )
        }
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    <header>
                        <p style={{ color: "red" }}>{JSON.stringify(this.state.error)}</p>
                    </header>
                    <main>
                        {this.renderMain()}
                    </main>
                </div>
            )
        }
        else {
            return (
                <div>
                    <header>
                    </header>
                    <main>
                        {this.renderMain()}
                    </main>
                </div>
            )
        }
    }
}

ReactDOM.render(<App />, document.getElementById('app'));

