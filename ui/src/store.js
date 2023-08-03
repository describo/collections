import { cloneDeep } from "lodash";
import { createStore } from "vuex";
import router from "./routes";
import HTTPService from "./http.service";
const $http = new HTTPService({ router });

const mutations = {
    reset: (state) => {
        state = cloneDeep(resetState());
    },
    saveConfiguration: (state, payload) => {
        state.configuration = { ...payload };
    },
    setUserData(state, payload) {
        state.user = { ...payload };
    },
    setMyCollections(state, collections) {
        state.myCollections = [...collections];
    },
    setCurrentCollection(state, collection) {
        state.currentCollection = { ...collection };
    },
};

const actions = {
    async getMyCollections({ commit }) {
        let response = await $http.get({ route: "/collections" });
        response = await response.json();
        commit("setMyCollections", response.collections);
    },
};

export const store = new createStore({
    state: resetState(),
    mutations,
    actions,
    modules: {},
});

function resetState() {
    return {
        configuration: undefined,
        user: {},
        myCollections: [],
        currentCollection: {},
    };
}
