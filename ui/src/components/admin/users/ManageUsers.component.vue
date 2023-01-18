<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <el-pagination
                layout="prev, pager, next"
                :total="total"
                :page-size="limit"
                @current-change="paginate"
            ></el-pagination>
            <el-select
                v-model="orderBy"
                class="m-2"
                placeholder="Order results by"
                @change="getUsers()"
            >
                <el-option
                    v-for="item in orderByOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                >
                </el-option>
            </el-select>
        </div>
        <el-table :data="users" style="width: 100%">
            <el-table-column prop="email" label="Email" width="300" />
            <el-table-column prop="givenName" label="Given name" width="180" />
            <el-table-column prop="familyName" label="Family Name" width="180" />
            <el-table-column prop="locked" label="Locked" width="120">
                <template #header>
                    <i class="fa-solid fa-lock"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.locked"
                        @change="toggle({ action: 'lock', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="upload" label="Upload" width="120">
                <template #header>
                    <i class="fa-solid fa-upload"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.upload"
                        @change="toggle({ action: 'upload', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="administrator" label="Admin" width="120">
                <template #header>
                    <i class="fa-solid fa-user-shield"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.administrator"
                        @change="toggle({ action: 'admin', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="" label="Delete" width="120">
                <template #header>
                    <i class="fa-solid fa-user-minus"></i>
                </template>
                <template #default="scope">
                    <el-popconfirm
                        title="Are you sure to want to delete this user account?"
                        @confirm="deleteUser({ user: scope.row })"
                    >
                        <template #reference>
                            <el-button type="danger" size="small">
                                <i class="fa-solid fa-trash-alt"></i>
                            </el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script>
export default {
    data() {
        return {
            users: [],
            error: false,
            done: true,
            total: 0,
            offset: 0,
            limit: 10,
            loggedInUser: this.$store.state.user,
            orderBy: "familyName",
            orderByOptions: [
                { label: "Order By: email", value: "email" },
                { label: "Order By: Given Name", value: "givenName" },
                { label: "Order By: Family Name", value: "familyName" },
                { label: "Order By: ability to upload", value: "upload" },
            ],
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.getUsers();
        },
        async getUsers() {
            let response = await this.$http.get({
                route: `/admin/users?offset=${this.offset}&limit=${this.limit}&orderBy=${this.orderBy}`,
            });
            if (response.status !== 200) {
                this.error = true;
            }
            let data = await response.json();
            this.users = data.users.filter((u) => u.id !== this.loggedInUser.id);
            this.total = data.total;
        },
        paginate(page) {
            this.offset = (page - 1) * this.limit;
            this.getUsers();
        },
        updateUsersOrderBy() {
            this.offset = 0;
            this.getUsers();
        },
        async toggle({ action, user }) {
            let response;
            switch (action) {
                case "lock":
                    response = await this.$http.put({ route: `/admin/users/${user.id}/lock` });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
                case "upload":
                    response = await this.$http.put({
                        route: `/admin/users/${user.id}/upload`,
                    });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
                case "admin":
                    response = await this.$http.put({
                        route: `/admin/users/${user.id}/admin`,
                    });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
            }
            this.done = true;
        },
        async deleteUser({ user }) {
            let response = await this.$http.delete({
                route: `/admin/users/${user.id}`,
            });
            if (response.status !== 200) {
                this.error = true;
            }
            this.getUsers();
        },
    },
};
</script>
