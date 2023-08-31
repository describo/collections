import { inject } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";

export async function getCollectionInformation() {
    const $http = inject("$http");
    const $route = useRoute();
    const $store = useStore();
    let response = await $http.get({ route: `/collections/${$route.params.code}` });
    let { collection } = await response.json();
    $store.commit("setCurrentCollection", collection);
}
