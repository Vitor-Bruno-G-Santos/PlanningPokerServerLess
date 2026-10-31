import { createRouter, createWebHistory } from 'vue-router';
import LobbyPage from '@/pages/LobbyPage.vue';
import PokerRoomPage from '@/pages/PokerRoomPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'lobby',
      component: LobbyPage,
    },
    {
      path: '/room/:roomId',
      name: 'room',
      component: PokerRoomPage,
    },
  ],
});

export default router;
