<template>
    <div class="padding-20">

    </div>
</template>

<script setup>
import AgoraRTC from "agora-rtc-sdk-ng"
import AgoraVideoPlayer from "./AgoraVideoPlayer.vue";
import { onMounted, onUnmounted, ref } from "vue"


const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: 'vp8'
});

const joined = ref(false)
const remoteUsers = ref({})
const audioTrack = ref()
const screenVideoTrack = ref()
const screenAudioTrack = ref()

// Props
const props = defineProps({
    appId: { type: String, required: true },
    channel: { type: String, required: true },
    token: { type: String, default: null },
    uid: { type: String, default: "" }
});

onMounted(async () => {
    if (props.appId && props.channel) {
        join();
    }
});

onUnmounted(() => {
    if (joined.value) {
        leave()
    }
})


//bind "track-ended" event, and when screensharing is stopped, there is an alert to notify the end user.
const handleTrackEnded = (e) => {
    if (screenVideoTrack.value) {
        screenVideoTrack.value.close()
        screenVideoTrack.value = null
    }
    if (screenAudioTrack.value) {
        screenAudioTrack.value.close()
        screenAudioTrack.value = null
    }
    if (audioTrack.value) {
        audioTrack.value.close()
        audioTrack.value = null
    }
}



const initTracks = async () => {
    const tempAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    audioTrack.value = tempAudioTrack
    const tracks = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: "720p"
    }, "auto")
    if (tracks instanceof Array) {
        screenVideoTrack.value = tracks[0]
        screenAudioTrack.value = tracks[1]
        tracks[0].on('track-ended', handleTrackEnded)
        return [tempAudioTrack, ...tracks]
    } else {
        screenVideoTrack.value = tracks
        tracks.on('track-ended', handleTrackEnded)
        return [tempAudioTrack, tracks]
    }
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
        // Add event listeners to the client.
        client.on("user-published", handleUserPublished)
        client.on("user-unpublished", handleUserUnpublished);

        props.uid = await client.join(props.appId, props.channel, props.token || null, "screen_" + props.uid || null)
        const tracks = await initTracks()
        await client.publish(tracks)
        joined.value = true
    } catch (error) {
        console.error(error)
    }
}

const leave = async () => {
    screenAudioTrack.value?.close()
    screenVideoTrack.value?.close()
    audioTrack.value?.close()
    remoteUsers.value = {}
    await client.leave()
    joined.value = false
}

</script>