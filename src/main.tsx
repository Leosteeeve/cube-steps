import React from 'react';
import {createRoot} from 'react-dom/client';
import PlayerFixture from './player/PlayerFixture';
import {App} from './app/App';
import './styles.css';
createRoot(document.getElementById('root')!).render(import.meta.env.DEV&&new URLSearchParams(location.search).get('fixture')==='player'?<PlayerFixture/>:<App/>);
