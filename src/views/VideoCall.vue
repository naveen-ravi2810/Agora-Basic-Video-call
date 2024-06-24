<template>
    <div class="container flex h-screen font-sans">
        <div class="sidebar w-64 p-5 bg-gray-100 border-r border-gray-300 flex flex-col items-center">
            <form ref="formRef" @submit.prevent="join" class="form w-full mb-5">
                <div class="form-group mb-4">
                    <label for="appId" class="block mb-2 font-bold">App ID</label>
                    <input type="text" v-model="form.appId" id="appId" placeholder="Enter App ID"
                        class="w-full p-2 border border-gray-300 rounded" required>
                </div>
                <div class="form-group mb-4">
                    <label for="channel" class="block mb-2 font-bold">Channel</label>
                    <input type="text" v-model="form.channel" id="channel" placeholder="Enter Channel"
                        class="w-full p-2 border border-gray-300 rounded" required>
                </div>
                <div class="form-group mb-4">
                    <label for="token" class="block mb-2 font-bold">Token</label>
                    <input type="text" v-model="form.token" id="token" placeholder="Enter Token (if required)"
                        class="w-full p-2 border border-gray-300 rounded">
                </div>
                <div class="form-group mb-4">
                    <label for="uid" class="block mb-2 font-bold">UID</label>
                    <input type="text" v-model="form.uid" id="uid" placeholder="Enter UID (if required)"
                        class="w-full p-2 border border-gray-300 rounded">
                </div>
                <div class="btn-wrapper flex flex-col w-full">
                    <button type="submit" :disabled="joined"
                        class="btn-join bg-green-500 text-white p-2 rounded mb-2 disabled:opacity-50">Join</button>
                    <button type="button" :disabled="!joined" @click="leave"
                        class="btn-leave bg-red-500 text-white p-2 rounded mb-2 disabled:opacity-50">Leave</button>
                    <button type="button" :disabled="!joined" @click="toggleAudio"
                        class="btn-audio bg-blue-500 text-white p-2 rounded mb-2 disabled:opacity-50">
                        {{ isAudioEnabled ? 'Mute Audio' : 'Unmute Audio' }}
                    </button>
                    <button type="button" :disabled="!joined" @click="toggleVideo"
                        class="btn-video bg-orange-500 text-white p-2 rounded mb-2 disabled:opacity-50">
                        {{ isVideoEnabled ? 'Disable Video' : 'Enable Video' }}
                    </button>
                    <button type="button" :disabled="!joined" @click="toggleScreenSharing"
                        class="btn-leave bg-red-500 text-white p-2 rounded mb-2 disabled:opacity-50">Share
                        Screen</button>
                </div>
            </form>
            <div v-if="joined" class="user-list w-full">
                <div class="user-header font-bold mb-2">Users in Channel</div>
                <div class="user-info local-user mb-4">
                    <p class="flex gap-2 items-center ">{{ form.uid }} <span>(You)</span>
                        <img :src="currentVideoOnorOff" alt="Video Status" class="icon-small w-4 h-4" />
                        <img :src="currentMicroPhoneOnorOff" alt="Microphone Status" class="icon-small w-4 h-4" />
                    </p>
                </div>
                <div v-for="uid in channel_users" :key="uid"
                    class="user-info flex gap-2 items-center  remote-user mb-4">
                    <span>{{ uid }}</span>
                    <img :src="videoOnorOff(uid)" alt="Video Status" class="icon-small w-4 h-4" />
                    <img :src="microPhoneOnorOff(uid)" alt="Microphone Status" class="icon-small w-4 h-4" />
                </div>
            </div>
        </div>
        <div class="main-content flex-1 flex flex-col items-center justify-center p-5">
            <div v-if="joined" class="local-video w-full mb-5">
                <AgoraVideoPlayer v-if="videoTrack || audioTrack" :audioTrack="audioTrack" :videoTrack="videoTrack"
                    :isLocal="true"></AgoraVideoPlayer>
                <div v-else>
                    <p>{{ form.uid }}</p>
                    <img :src="Video404" alt="Video Not Found" class="placeholder-img w-24 h-24 object-cover">
                </div>
            </div>
            <div class="remote-videos grid grid-cols-4 gap-4 w-full overflow-auto">
                <div v-for="uid in channel_users" :key="uid"
                    class="video-wrapper flex flex-col items-center justify-center">
                    <div v-if="isVideoAudioOn(uid)">
                        <AgoraVideoPlayer v-for="item in remoteUsers" :v-if="item.uid === uid" :key="item.uid"
                            :videoTrack="item.videoTrack" :audioTrack="item.audioTrack"></AgoraVideoPlayer>
                        {{ uid }}
                    </div>
                    <div v-else>
                        <p>{{ uid }}</p>
                        <img :src="Video404" alt="Video Not Found" class="placeholder-img w-24 h-24 object-cover">
                    </div>
                </div>
            </div>
            <ScreenSharing v-if="screenShared" :appId="form.appId" :channel="form.channel" :token="form.token"
                :uid="form.uid">
            </ScreenSharing>
        </div>
    </div>
</template>

<script setup>
import AgoraRTC from "agora-rtc-sdk-ng";
import { onMounted, onUnmounted, ref, computed } from "vue";
import AgoraVideoPlayer from './../components/AgoraVideoPlayer.vue';
import ScreenSharing from "./../components/ScreenSharing.vue";
import Video404 from './../assets/placeholder.jpg';

// Define the image sources for the status icons
import videoOnIcon from './../assets/videoOnIcon.png'
import videoOffIcon from './../assets/videoOffIcon.png'
import audioOnIcon from './../assets/audioOnIcon.jpg'
import audioOffIcon from './../assets/audioOffIcon.png'
import router from "@/router";

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
const screenShared = ref(false);

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
    remoteUsers.value = {
        ...remoteUsers.value,
        [user.uid]: user
    };
};

const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
        const updatedUsers = { ...remoteUsers.value };
        delete updatedUsers[user.uid];
        remoteUsers.value = updatedUsers;
    }
};

const handleUserJoined = (user) => {
    const audio = new Audio(require('./../assets/mixkit-access-allowed-tone-2869.mp3'));
    audio.play();
    channel_users.value.push(user.uid);
};

const handleUserLeft = (user, reason) => {
    const index = channel_users.value.indexOf(user.uid);
    const audio = new Audio(require('./../assets/mixkit-access-allowed-tone-2869.mp3'));
    audio.play();
    if (index !== -1) {
        channel_users.value.splice(index, 1);
    }
};
// --------------------------------------------------------------------------------------------------- //

const isVideoAudioOn = (uid) => {
    return remoteUsers.value.hasOwnProperty(uid);
};

// ------------------------------- Side Basr status of the microphone and the video camera -----------//
const currentVideoOnorOff = computed(() => {
    return videoTrack.value && videoTrack.value.enabled ? videoOnIcon : videoOffIcon;
});

const currentMicroPhoneOnorOff = computed(() => {
    return audioTrack.value && audioTrack.value.enabled ? audioOnIcon : audioOffIcon;
});

const videoOnorOff = (uid) => {
    return computed(() => {
        const user = remoteUsers.value[uid];
        return user && user.videoTrack && user.videoTrack.enabled ? videoOnIcon : videoOffIcon;
    }).value;  // Access the computed value directly
};

const microPhoneOnorOff = (uid) => {
    return computed(() => {
        const user = remoteUsers.value[uid];
        return user && user.audioTrack && user.audioTrack.enabled ? audioOnIcon : audioOffIcon;
    }).value;  // Access the computed value directly
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
    router.replace("/")
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


const toggleScreenSharing = async () => {
    screenShared.value = !screenShared.value;
};
</script>

<style scoped>
@import "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";

.icon-small {
    width: 16px;
    height: 16px;
    vertical-align: middle;
}

.placeholder-img {
    width: 100px;
    height: 100px;
    object-fit: cover;
}
</style>
