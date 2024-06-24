<template>
    <div class="padding-20">
        <form ref="formRef" @submit.prevent="join">
            <div>
                <label for="appId">App ID</label>
                <input type="text" v-model="form.appId" id="appId" placeholder="Enter App ID" required>
            </div>
            <div>
                <label for="channel">Channel</label>
                <input type="text" v-model="form.channel" id="channel" placeholder="Enter Channel" required>
            </div>
            <div>
                <label for="token">Token</label>
                <input type="text" v-model="form.token" id="token" placeholder="Enter Token (if required)">
            </div>
            <div>
                <label for="uid">UID</label>
                <input type="text" v-model="form.uid" id="uid" placeholder="Enter UID (if required)">
            </div>
            <div class="btn-wrapper mt-10">
                <button type="submit" :disabled="joined">Join</button>
                <button type="button" :disabled="!joined" @click="leave">Leave</button>
                <button type="button" :disabled="!joined" @click="toggleAudio">
                    {{ isAudioEnabled ? 'Mute Audio' : 'Unmute Audio' }}
                </button>
                <button type="button" :disabled="!joined" @click="toggleVideo">
                    {{ isVideoEnabled ? 'Disable Video' : 'Enable Video' }}
                </button>
            </div>
        </form>
        <div v-if="joined" class="mt-10">
            <div class="text">Local User</div>
            <AgoraVideoPlayer v-if="videoTrack || audioTrack" :audioTrack="audioTrack" :videoTrack="videoTrack"
                :isLocal="true"></AgoraVideoPlayer>
            <div v-else>
                {{ uid }}
                <img :src="Video404" alt="VideoNot Found">
            </div>
        </div>
        <div class="text">Remote Users</div>
        <div v-for="uid in channel_users" :key="uid">
            <div v-if="isVideoAudioOn(uid)">
                <AgoraVideoPlayer v-for="item in remoteUsers" :v-if="item.uid === uid" :key="item.uid"
                    :videoTrack="item.videoTrack" :audioTrack="item.audioTrack" :text="item.uid">
                </AgoraVideoPlayer>
            </div>
            <div v-else>
                {{ uid }}
                <img :src="Video404" alt="VideoNot Found">
            </div>
        </div>
    </div>
</template>

<script setup>
import AgoraRTC from "agora-rtc-sdk-ng"
import { onMounted, onUnmounted, ref, computed } from "vue"
import AgoraVideoPlayer from './../components/AgoraVideoPlayer.vue'
import Video404 from './../assets/placeholder.jpg'
let client = null
let codec = 'vp8'

const joined = ref(false)
const remoteUsers = ref({})
const audioTrack = ref(null)
const videoTrack = ref(null)
const formRef = ref()
const form = ref({
    appId: '',
    channel: '',
    token: '',
    uid: ''
})
const channel_users = ref([])

onUnmounted(() => {
    if (joined.value) {
        leave()
    }
})

const initAudioTrack = async () => {
    if (audioTrack.value) {
        return
    }
    audioTrack.value = await AgoraRTC.createMicrophoneAudioTrack()
}

const initVideoTrack = async () => {
    if (videoTrack.value) {
        return
    }
    videoTrack.value = await AgoraRTC.createCameraVideoTrack()
}

const handleUserPublished = async (user, mediaType) => {
    await client.subscribe(user, mediaType)
    delete remoteUsers.value[user.uid]
    remoteUsers.value[user.uid] = user
}

const handleUserUnpublished = (user, mediaType) => {
    if (mediaType == 'video') {
        delete remoteUsers.value[user.uid]
    }
}

const handleUserJoined = (user) => {
    channel_users.value.push(user.uid)
}

const handleUserLeft = (user, reason) => {
    const index = full_users.value.indexOf(user.uid)
    if (index !== -1) {
        full_users.value.splice(index, 1)
    }
}

const isVideoAudioOn = (uid) => {
    return remoteUsers.value.hasOwnProperty(uid);
}


const getVideoTrack = (uid) => {
    // Ensure remoteUsers.value is an array
    if (!Array.isArray(remoteUsers.value)) {
        return null; // or handle error case appropriately
    }

    const user = remoteUsers.value.find(user => user.uid === uid);
    return user ? user.videoTrack : null;
}

const getAudioTrack = (uid) => {
    // Ensure remoteUsers.value is an array
    if (!Array.isArray(remoteUsers.value)) {
        return null; // or handle error case appropriately
    }

    const user = remoteUsers.value.find(user => user.uid === uid);
    return user ? user.audioTrack : null;
}

const join = async () => {
    try {
        if (!client) {
            client = AgoraRTC.createClient({
                mode: "rtc",
                codec: codec
            })
        }

        // Add event listeners to the client.
        client.on("user-published", handleUserPublished)
        client.on("user-unpublished", handleUserUnpublished)
        client.on("user-joined", handleUserJoined)
        client.on("user-left", handleUserLeft)

        const options = { ...form.value }
        options.uid = await client.join(options.appId, options.channel, options.token || null, options.uid || null)
        joined.value = true
    } catch (error) {
        console.error(error)
    }
}

const leave = async () => {
    if (audioTrack.value) {
        audioTrack.value.close()
        audioTrack.value = null
    }
    if (videoTrack.value) {
        videoTrack.value.close()
        videoTrack.value = null
    }
    remoteUsers.value = {}
    await client.leave()
    joined.value = false
}

const toggleAudio = async () => {
    if (audioTrack.value) {
        audioTrack.value.setEnabled(!audioTrack.value.enabled)
    } else {
        await initAudioTrack()
        await client.publish([audioTrack.value])
    }
}

const toggleVideo = async () => {
    if (videoTrack.value) {
        videoTrack.value.setEnabled(!videoTrack.value.enabled)
    } else {
        await initVideoTrack()
        await client.publish([videoTrack.value])
    }
}

const isAudioEnabled = computed(() => audioTrack.value ? audioTrack.value.enabled : false)
const isVideoEnabled = computed(() => videoTrack.value ? videoTrack.value.enabled : false)
</script>

<style>
.padding-20 {
    padding: 20px;
}

.mt-10 {
    margin-top: 10px;
}

.btn-wrapper {
    display: flex;
    align-items: center;
}

.text {
    font-weight: bold;
    margin-bottom: 10px;
}

form div {
    margin-bottom: 10px;
}

form label {
    display: block;
    margin-bottom: 5px;
}

form input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
}

button {
    padding: 8px 16px;
    margin-right: 10px;
}
</style>