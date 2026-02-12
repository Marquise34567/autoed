// Stub for firebase-admin to satisfy frontend builds. Server implementation disabled.
const admin = {
  auth() {
    return {
      getUser: async () => null,
    }
  }
}

export default admin
