<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <div>
                <el-select
                    v-model="selectedLevel"
                    placeholder="Select"
                    clearable
                    @change="changeLevel"
                >
                    <el-option
                        v-for="(level, idx) in levels"
                        :key="idx"
                        :label="level"
                        :value="level"
                    >
                    </el-option>
                </el-select>
            </div>

            <el-date-picker
                v-model="datetimerange"
                type="datetimerange"
                start-placeholder="Start Date"
                end-placeholder="End Date"
                @change="changeDateTime"
            >
            </el-date-picker>
            <div class="flex-grow"></div>
            <el-pagination
                layout="prev, pager, next"
                :total="total"
                :current-page="currentPage"
                :page-size="limit"
                @current-change="changePage"
            ></el-pagination>
        </div>
        <el-table :data="logs">
            <el-table-column type="expand">
                <template #default="props">
                    {{ props.row.data }}
                </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="Date" width="220">
                <template #default="props">
                    {{ formatDate(props.row.createdAt) }}
                </template>
            </el-table-column>
            <el-table-column prop="level" label="Level" width="80" />
            <el-table-column prop="owner" label="Owner" width="250" />
            <el-table-column prop="text" label="Text" width="800" />
        </el-table>
    </div>
</template>

<script>
import { format, parseISO } from "date-fns";
export default {
    data() {
        return {
            logs: [],
            total: 0,
            limit: 20,
            offset: 0,
            currentPage: 1,
            datetimerange: [],
            levels: ["info", "warn", "error"],
            selectedLevel: undefined,
        };
    },
    mounted() {
        this.getLogs({});
    },
    methods: {
        async getLogs({ page, level, dateFrom, dateTo }) {
            let offset = page ? (page - 1) * this.limit : this.offset;
            let params = { limit: this.limit, offset };
            if (level) params.level = level;
            if (dateFrom) {
                params.dateFrom = dateFrom;
                params.dateTo = dateTo;
            }
            let response = await this.$http.get({
                route: "/admin/logs",
                params,
            });
            let logs = (await response.json()).logs;
            this.logs = logs.rows;
            this.total = logs.count;
        },
        async changePage(page) {
            this.currentPage = page;
            await this.getLogs({ page });
        },
        async changeLevel(level) {
            this.currentPage = 1;
            await this.getLogs({ page: 1, level });
        },
        async changeDateTime(datetime) {
            if (datetime) {
                await this.getLogs({
                    dateFrom: datetime[0].toISOString(),
                    dateTo: datetime[1].toISOString(),
                });
            } else {
                await this.getLogs({});
            }
        },
        formatDate(date) {
            return format(parseISO(date), "PPpp");
        },
    },
};
</script>
