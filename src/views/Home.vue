<template lang="">
    <div class="flex justify-center gap-32 pt-32">
        <router-link class="text-red-400"  :to="{name:'Audio'}"><button class="p-2 text-red-400 hover:text-red-700 bg-gray-300">Audio Call</button></router-link>
        <br/>
        <router-link  :to="{name:'Video'}"><button class="p-2 text-red-400 hover:text-red-700 bg-gray-300">Video Call</button></router-link>
    </div>
</template>
<script>
export default {

}
</script>
<style lang="">

</style>