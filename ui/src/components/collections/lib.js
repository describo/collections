import { ProfileManager } from "@describo/crate-builder-component/src/crate-builder/profile-manager.js";

export async function getCollectionInformation({ $http, $route, $store }) {
    let response = await $http.get({ route: `/collections/${$route.params.code}` });
    let { collection } = await response.json();
    $store.commit("setCurrentCollection", collection);
}

export async function getProfile({ $http, $route }) {
    let response = await $http.get({
        route: `/collections/${$route.params.code}/profile`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    response = await response.json();
    const profile = response.profile;
    const profileManager = new ProfileManager({ profile });
    return { profile, profileManager };
}
