import './style.css'

import { firebaseConfig } from './config/firebase.config.js'
import { getFirestore } from 'firebase/firestore'

import { initializeApp, getApps } from "firebase/app"

const screenshareButton = document.getElementById('screenshareButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const fs = getFirestore();

let remoteStream = null;
let localStream = null;

screenshareButton.onclick = async () => {
  console.log("screenshare clicked");

  const localStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  });

  remoteStream = new MediaStream();

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  screenshareButton.disabled = true;
};