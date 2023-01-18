import { tokenSessionKey, getLocalStorage } from "./components/storage";
import { isNumber, isString, isBoolean } from "lodash";

export default class HTTPService {
    constructor({ router, loginPath = "/login" }) {
        this.router = router;
        this.loginPath = loginPath;
    }

    getHeaders() {
        try {
            let { token } = getLocalStorage({ key: tokenSessionKey });
            return {
                authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };
        } catch (error) {
            return {
                "Content-Type": "application/json",
            };
        }
    }

    getToken() {
        try {
            let { token } = getLocalStorage({ key: tokenSessionKey });
            return token;
        } catch (error) {}
    }

    encodeRoute(route, queryString, method) {
        route = encodeURI(route);
        route = queryString ? `${route}?${queryString}` : route;
        console.debug(`${method}: ${route}`);
        return route;
    }

    assembleQueryString(params) {
        let queryString = "";
        Object.keys(params).forEach((p) => {
            if (isNumber(params[p]) || isString(params[p]) || isBoolean(params[p])) {
                queryString += `${p}=${encodeURIComponent(params[p])}&`;
            }
        });
        return queryString.slice(0, -1);
    }

    async get({ route, params, headers = null }) {
        let queryString;
        if (!headers) headers = await this.getHeaders();
        if (params) {
            queryString = this.assembleQueryString(params);
        }
        route = this.encodeRoute(route, queryString, "GET");
        let response = await fetch(`/api${route}`, {
            method: "GET",
            headers,
        });
        this.checkAuthorised({ status: response.status });
        return response;
    }

    async post({ route, params, headers = null, body = {} }) {
        let queryString;
        if (!headers) headers = await this.getHeaders();
        if (params) {
            queryString = this.assembleQueryString(params);
        }
        route = this.encodeRoute(route, queryString, "POST");
        let response = await fetch(`/api${route}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        this.checkAuthorised({ status: response.status });
        return response;
    }

    async put({ route, params, headers = null, body = {} }) {
        let queryString;
        if (!headers) headers = await this.getHeaders();
        if (params) {
            queryString = this.assembleQueryString(params);
        }
        route = this.encodeRoute(route, queryString, "PUT");
        let response = await fetch(`/api${route}`, {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        this.checkAuthorised({ status: response.status });
        return response;
    }

    async delete({ route, headers = null, params }) {
        let queryString;
        if (!headers) headers = await this.getHeaders();
        if (params) {
            queryString = this.assembleQueryString(params);
        }
        route = this.encodeRoute(route, queryString, "DELETE");
        let response = await fetch(`/api${route}`, {
            method: "delete",
            headers: this.getHeaders(),
        });
        this.checkAuthorised({ status: response.status });
        return response;
    }

    checkAuthorised({ status }) {
        if (status === 401) {
            this.router.push(this.loginPath);
        }
    }
}
