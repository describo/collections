<template>
    <div class="flex flex-col">
        <div class="text-gray-700">
            Enter in the email addresses of people who should have access to this service. Separate
            emails with a comma and don't worry about duplicate entries.
        </div>
        <div class="text-xl">
            <el-input v-model="textarea" :rows="20" type="textarea" placeholder="Please input" />
        </div>
        <div>
            <el-button @click="whitelistUsers">Allow these users</el-button>
        </div>
    </div>
</template>

<script>
import { uniq } from "lodash";

export default {
    data() {
        return {
            textarea: "",
            error: false,
        };
    },
    mounted() {},
    methods: {
        async whitelistUsers() {
            let emails = this.textarea.match(
                /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi
            );
            emails = uniq(emails);
            let response = await this.$http.post({
                route: `/admin/users`,
                body: { emails },
            });
            if (response.status !== 200) {
                this.error = true;
            }
            this.textarea = "";
        },
    },
};
</script>
