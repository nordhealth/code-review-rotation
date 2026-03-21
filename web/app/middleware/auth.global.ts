const PUBLIC_ROUTES = ['/login', '/register', '/confirm', '/forgot-password', '/reset-password']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (PUBLIC_ROUTES.includes(to.path)) {
    if (loggedIn.value && to.path !== '/confirm')
      return navigateTo('/')
    return
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
