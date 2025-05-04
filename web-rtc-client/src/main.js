import './style.css'

import { firebaseConfig } from './config/firebase.config.js';
import 'firebase/compat/firestore';
import firebase from 'firebase/compat/app'

const screenshareButton = document.getElementById('screenshareButton');
const callButton = document.getElementById('callButton');
const answerButton = document.getElementById('answerButton');
const hangupButton = document.getElementById('hangupButton');
const callInput = document.getElementById('callInput');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

let remoteStream = null;
let localStream = null;

screenshareButton.onclick = async () => {
  console.log("screenshare clicked");

  localStream = await navigator.mediaDevices.getDisplayMedia({
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

  localStream.getVideoTracks()[0].onended = () => {
    console.log("Uh oh. Video ended lol.");
    // localVideo.pause();
    // localVideo.removeAttribute('srcObject');
    // localVideo.removeAttribute('src');
    // localVideo.load();
    localVideo.srcObject = null; 
    screenshareButton.disabled = false;
  };

  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  screenshareButton.disabled = true;
  callButton.disabled = false;
  answerButton.disabled = false;
};

localVideo.onclose = () => {
  console.log("Video stopped");
};

callButton.onclick = async () => {
  console.log("callButton Clicked");
  const callDoc = db.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  console.log("calldoc ID: " + callDoc.id);

  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer })
    .then(() => { console.log("Offer successfully written!"); })
    .catch((error) => { console.error("Error writing document: ", error); });

  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};

const testButton = document.getElementById('testButton');

testButton.onclick = async () => {
  db.collection("myCollection").doc("myDocument").set({ name: "Test" })
  .then(() => { console.log("Document successfully written!"); })
  .catch((error) => { console.error("Error writing document: ", error); });
};

answerButton.onclick = async () => {
  console.log("Answer button clicked");
  const callId = callInput.value;
  const callDoc = db.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};