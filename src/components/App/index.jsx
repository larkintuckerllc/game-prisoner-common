import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_EMAIL, RUNNING } from '../../strings';
import { ServerException } from '../../util/exceptions';
import * as fromAuthenticated from '../../ducks/authenticated';
import * as fromConnected from '../../ducks/connected';
import * as fromGameState from '../../ducks/gameState';
import Connecting from './Connecting';
import Alert from './Alert';
import Login from './Login';
import State from './State';

const handleLogin = password => (
  firebase.auth().signInWithEmailAndPassword(
    FIREBASE_EMAIL,
    password,
  ).catch((error) => {
    if (error.code === 'auth/wrong-password') {
      throw new ServerException('401');
    }
    throw new ServerException('500');
  })
);
class App extends Component {
  constructor(props) {
    super(props);
    this.handleGameState = this.handleGameState.bind(this);
  }
  componentDidMount() {
    const {
      setAuthenticated,
      setConnected,
    } = this.props;
    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged((user) => {
      if (user !== null) {
        setAuthenticated(true);
        // PRESENCE
        const connectedRef = firebase.database().ref('.info/connected');
        connectedRef.on('value', (snap) => {
          if (snap.val() === true) {
            setConnected(true);
          } else {
            setConnected(false);
          }
        });
        // STATE
        firebase.database().ref('gameState').on('value', this.handleGameState);
      }
    });
    firebase.auth().signOut();
  }
  handleGameState(snap) {
    const { setGameState } = this.props;
    const gameState = snap.val();
    setGameState(gameState);
  }
  render() {
    const {
      authenticated,
      connected,
      gameState,
    } = this.props;
    if (RUNNING) return <Alert message="running in another window" />;
    if (!authenticated) return <Login onLogin={handleLogin} />;
    if (!connected || gameState === null) return <Connecting />;
    return (
      <div>
        <State gameState={gameState} />
      </div>
    );
  }
}
App.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  connected: PropTypes.bool.isRequired,
  gameState: PropTypes.string,
  setAuthenticated: PropTypes.func.isRequired,
  setConnected: PropTypes.func.isRequired,
  setGameState: PropTypes.func.isRequired,
};
App.defaultProps = {
  gameState: null,
};
export default connect(
  state => ({
    authenticated: fromAuthenticated.getAuthenticated(state),
    connected: fromConnected.getConnected(state),
    gameState: fromGameState.getGameState(state),
  }),
  {
    setAuthenticated: fromAuthenticated.setAuthenticated,
    setConnected: fromConnected.setConnected,
    setGameState: fromGameState.setGameState,
  },
)(App);
