import * as VueRouter from "vue-router";
import Collections from "./components/Collections.vue";
import Account from "./components/Account.vue";
import EditCollection from "./components/EditCollection.vue";

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    { path: "/", component: Collections, meta: { name: "Collections" } },
    {
      path: "/edit-collection",
      component: EditCollection,
      meta: { name: "Collection" },
      props: (route: any) => route.query,
    },
    { path: "/account", component: Account, meta: { name: "Account" } },
  ],
});

export default router;
