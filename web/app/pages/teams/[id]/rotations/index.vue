<script setup lang="ts">
const route = useRoute()
const teamId = route.params.id as string

await navigateTo(`/teams/${teamId}/rotations/developers`, { replace: true })
</script>
