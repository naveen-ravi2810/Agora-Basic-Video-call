<template>
    <div class="container">
        <div class="sidebar">
            <form ref="formRef" @submit.prevent="join" class="form">
                <div class="form-group">
                    <label for="appId">App ID</label>
                    <input type="text" v-model="form.appId" id="appId" placeholder="Enter App ID" required>
                </div>
                <div class="form-group">
                    <label for="channel">Channel</label>
                    <input type="text" v-model="form.channel" id="channel" placeholder="Enter Channel" required>
                </div>
                <div class="form-group">
                    <label for="token">Token</label>
                    <input type="text" v-model="form.token" id="token" placeholder="Enter Token (if required)">
                </div>
                <div class="form-group">
                    <label for="uid">UID</label>
                    <input type="text" v-model="form.uid" id="uid" placeholder="Enter UID (if required)">
                </div>
                <div class="btn-wrapper">
                    <button type="submit" :disabled="joined" class="btn btn-join">Join</button>
                    <button type="button" :disabled="!joined" @click="leave" class="btn btn-leave">Leave</button>
                    <button type="button" :disabled="!joined" @click="toggleAudio" class="btn btn-audio">
                        {{ isAudioEnabled ? 'Mute Audio' : 'Unmute Audio' }}
                    </button>
                    <button type="button" :disabled="!joined" @click="toggleVideo" class="btn btn-video">
                        {{ isVideoEnabled ? 'Disable Video' : 'Enable Video' }}
                    </button>
                </div>
            </form>

            <div v-if="joined" class="user-list">
                <div class="user-header">Users in Channel</div>
                <div class="user-info local-user">
                    <p>{{ form.uid }} <span>(You)</span>
                        <img :src="CurrentVideoOnorOff()" alt="Video Status" class="icon-small" />
                        <img :src="CurrentMicroPhoneOnorOff()" alt="Microphone Status" class="icon-small" />
                    </p>
                </div>
                <div v-for="uid in channel_users" :key="uid" class="user-info remote-user">
                    <span>{{ uid }}</span>
                    <img :src="VideoOnorOff(uid)" alt="Video Status" class="icon-small" />
                    <img :src="MicroPhoneOnorOff(uid)" alt="Microphone Status" class="icon-small" />
                </div>
            </div>
        </div>

        <div class="main-content">
            <div v-if="joined" class="local-video">
                <AgoraVideoPlayer v-if="videoTrack || audioTrack" :audioTrack="audioTrack" :videoTrack="videoTrack"
                    :isLocal="true"></AgoraVideoPlayer>
                <div v-else>
                    <p>{{ form.uid }}</p>
                    <img :src="Video404" alt="Video Not Found" class="placeholder-img">
                </div>
            </div>

            <div class="remote-videos">
                <div v-for="uid in channel_users" :key="uid" class="video-wrapper">
                    <div v-if="isVideoAudioOn(uid)">
                        <AgoraVideoPlayer v-for="item in remoteUsers" :v-if="item.uid === uid" :key="item.uid"
                            :videoTrack="item.videoTrack" :audioTrack="item.audioTrack"></AgoraVideoPlayer>
                    </div>
                    <div v-else>
                        <p>{{ uid }}</p>
                        <img :src="Video404" alt="Video Not Found" class="placeholder-img">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import AgoraRTC from "agora-rtc-sdk-ng";
import { onMounted, onUnmounted, ref, computed } from "vue";
import AgoraVideoPlayer from './../components/AgoraVideoPlayer.vue';
import Video404 from './../assets/placeholder.jpg';

// Define the image sources for the status icons
import videoOnIcon from './../assets/videoOnIcon.png'
import videoOffIcon from './../assets/videoOffIcon.png'
import audioOnIcon from './../assets/audioOnIcon.jpg'
import audioOffIcon from './../assets/audioOffIcon.png'


let client = null;
let codec = 'vp8';

const joined = ref(false);
const remoteUsers = ref({});
const audioTrack = ref(null);
const videoTrack = ref(null);
const formRef = ref();
const form = ref({
    appId: '',
    channel: '',
    token: '',
    uid: ''
});
const channel_users = ref([]);

onUnmounted(() => {
    if (joined.value) {
        leave();
    }
});

const initAudioTrack = async () => {
    if (audioTrack.value) {
        return;
    }
    audioTrack.value = await AgoraRTC.createMicrophoneAudioTrack();
};

const initVideoTrack = async () => {
    if (videoTrack.value) {
        return;
    }
    videoTrack.value = await AgoraRTC.createCameraVideoTrack();
};


// ------------------------------Event handlers for the socket connection--------------- //
const handleUserPublished = async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    delete remoteUsers.value[user.uid];
    remoteUsers.value[user.uid] = user;
};

const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
        delete remoteUsers.value[user.uid];
    }
};

const handleUserJoined = (user) => {
    channel_users.value.push(user.uid);
};

const handleUserLeft = (user, reason) => {
    const index = channel_users.value.indexOf(user.uid);
    if (index !== -1) {
        channel_users.value.splice(index, 1);
    }
};
// --------------------------------------------------------------------------------------------------- //

const isVideoAudioOn = (uid) => {
    return remoteUsers.value.hasOwnProperty(uid);
};


// ------------------------------- Side Basr status of the microphone and the video camera -----------//
const CurrentVideoOnorOff = () => {
    return videoTrack.value && videoTrack.value.enabled ? videoOnIcon : videoOffIcon;
};

const CurrentMicroPhoneOnorOff = () => {
    return audioTrack.value && audioTrack.value.enabled ? audioOnIcon : audioOffIcon;
};

const VideoOnorOff = (uid) => {
    const user = remoteUsers.value[uid];
    return user && user.videoTrack && user.videoTrack.enabled ? videoOnIcon : videoOffIcon;
};

const MicroPhoneOnorOff = (uid) => {
    const user = remoteUsers.value[uid];
    return user && user.audioTrack && user.audioTrack.enabled ? audioOnIcon : audioOffIcon;
};
// --------------------------------------------------------------------------------------------------- //


// --------------------------------Channel Join and leave--------------------------------------------- //
const join = async () => {
    try {
        if (!client) {
            client = AgoraRTC.createClient({
                mode: "rtc",
                codec: codec
            });
        }

        // Add event listeners to the client.
        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);
        client.on("user-joined", handleUserJoined);
        client.on("user-left", handleUserLeft);

        const options = { ...form.value };
        options.uid = await client.join(options.appId, options.channel, options.token || null, options.uid || null);
        joined.value = true;
    } catch (error) {
        console.error(error);
    }
};

const leave = async () => {
    if (audioTrack.value) {
        audioTrack.value.close();
        audioTrack.value = null;
    }
    if (videoTrack.value) {
        videoTrack.value.close();
        videoTrack.value = null;
    }
    remoteUsers.value = {};
    await client.leave();
    joined.value = false;
};
// --------------------------------------------------------------------------------------------------- //


// ---------------------------------Audio and Video Core----------------------------------------------- //
const toggleAudio = async () => {
    if (audioTrack.value) {
        audioTrack.value.setEnabled(!audioTrack.value.enabled);
    } else {
        await initAudioTrack();
        await client.publish([audioTrack.value]);
    }
};

const toggleVideo = async () => {
    if (videoTrack.value) {
        videoTrack.value.setEnabled(!videoTrack.value.enabled);
    } else {
        await initVideoTrack();
        await client.publish([videoTrack.value]);
    }
};

const isAudioEnabled = computed(() => audioTrack.value ? audioTrack.value.enabled : false);
const isVideoEnabled = computed(() => videoTrack.value ? videoTrack.value.enabled : false);
// --------------------------------------------------------------------------------------------------- //


</script>


<style scoped>
.container {
    display: flex;
    height: 100vh;
    font-family: Arial, sans-serif;
}

.sidebar {
    width: 250px;
    padding: 20px;
    background-color: #f7f7f7;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.form {
    width: 100%;
    margin-bottom: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.btn-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: white;
    margin-bottom: 10px;
}

.btn-join {
    background-color: #4caf50;
}

.btn-leave {
    background-color: #f44336;
}

.btn-audio {
    background-color: #2196f3;
}

.btn-video {
    background-color: #ff9800;
}

.user-list {
    width: 100%;
}

.user-header {
    font-weight: bold;
    margin-bottom: 10px;
}

.user-info {
    margin-bottom: 15px;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.local-video {
    width: 100%;
    margin-bottom: 20px;
}

.remote-videos {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
}

.video-wrapper {
    width: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.placeholder-img {
    width: 100px;
    height: 100px;
    object-fit: cover;
}

.icon-small {
    width: 16px;
    /* Adjust the width as needed */
    height: 16px;
    /* Adjust the height as needed */
    vertical-align: middle;
    /* Align the icons with the text */
}
</style>
