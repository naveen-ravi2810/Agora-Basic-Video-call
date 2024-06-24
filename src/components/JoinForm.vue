<!-- JoinForm.vue -->
<template>
    <form @submit.prevent="onSubmit">
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
            <button type="submit">Join</button>
        </div>
    </form>
</template>

<script setup>
import { ref, defineEmits, defineExpose } from 'vue'

const emits = defineEmits(['submit'])
const form = ref({
    appId: '',
    channel: '',
    token: '',
    uid: ''
})

const onSubmit = () => {
    emits('submit', form.value)
}

defineExpose({
    setValue(value) {
        form.value = value
    },
    getValue() {
        return form.value
    }
})
</script>

<style>
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
}
</style>