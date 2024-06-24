import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
} from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("./../views/Home.vue"),
  },
  {
    path: "/audio",
    name: "Audio",
    component: () => import("./../views/AudioCall.vue"),
  },
  {
    path: "/video",
    name: "Video",
    component: () => import("./../views/VideoCall.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
