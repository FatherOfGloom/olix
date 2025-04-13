import './style.css'

const screenshareButton = document.getElementById('screenshareButton');
const localVideo = document.getElementById('localVideo');

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

let remoteStream = null;

screenshareButton.onclick = async () => {
  console.log("screenshare clicked");

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  });

  remoteStream = new MediaStream();

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  // pc.onicecandidate = ({ candidate }) => {
  //   if (candidate) {
  //     // signalingSend({ type: 'ice-candidate', candidate});
  //   }
  // }

  pc.ontrack = (event) => {
    // localVideo.srcObject = event.streams[0];
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  localVideo.srcObject = stream;

  // const offer = await pc.createOffer();
  // await pc.setLocalDescription(offer);
  // signalingSend({ type: 'offer', sdp: offer.sdp });
};