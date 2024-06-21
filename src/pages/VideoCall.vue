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
            </div>
        </form>
        <div v-if="joined" class="mt-10">
            <div class="text">Local User</div>
            <AgoraVideoPlayer :audioTrack="audioTrack" :videoTrack="videoTrack" :isLocal="true"></AgoraVideoPlayer>
        </div>
        <div v-if="Object.keys(remoteUsers).length">
            <div class="text">Remote Users</div>
            <div style="display: flex; gap: 10px;">
                <AgoraVideoPlayer v-for="item in remoteUsers" :key="item.uid" :videoTrack="item.videoTrack"
                    :audioTrack="item.audioTrack" :text="item.uid">
                </AgoraVideoPlayer>
            </div>
        </div>
    </div>
</template>

<script setup>
import AgoraRTC from "agora-rtc-sdk-ng"
import { onMounted, onUnmounted, ref } from "vue"
import { ElMessage } from 'element-plus'
import AgoraVideoPlayer from './../components/AgoraVideoPlayer.vue'
// import { showJoinedMessage } from "./../utils/utils"

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

onMounted(async () => {
    await initTracks()
})

onUnmounted(() => {
    if (joined.value) {
        leave()
    }
})

const profileChange = async (val) => {
    await videoTrack.value?.setEncoderConfiguration(val)
}

const codecChange = (val) => {
    codec = val
}

const initTracks = async () => {
    if (audioTrack.value && videoTrack.value) {
        return
    }
    const tracks = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack()
    ])
    audioTrack.value = tracks[0]
    videoTrack.value = tracks[1]
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

const join = async () => {
    try {
        if (!client) {
            client = AgoraRTC.createClient({
                mode: "rtc",
                codec: codec
            });
        }

        // Add event listeners to the client.
        client.on("user-published", handleUserPublished)
        client.on("user-unpublished", handleUserUnpublished);

        const options = { ...form.value }
        // Join a channel
        options.uid = await client.join(options.appId, options.channel, options.token || null, options.uid || null)
        await initTracks()
        const tracks = [audioTrack.value, videoTrack.value]
        await client.publish(tracks)
        // showJoinedMessage(options)
        joined.value = true
    } catch (error) {
        console.error(error)
        // ElMessage.error(error.message)
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
    // ElMessage.success('leave channel success!')
}
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