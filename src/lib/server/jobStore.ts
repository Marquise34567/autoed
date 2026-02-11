// Stub job store for frontend build. Server job queue is disabled.
export const JobStore = {
  async enqueue() {
    return null
  },
}
