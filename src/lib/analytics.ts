type AnalyticsEvent =
  | 'build.saved'
  | 'template.loaded'
  | 'tier.upgraded'
  | 'ai.tool_call'
  | 'share_url.opened'

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  // Stub — wire up Plausible or Umami here in a later sprint
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props)
  }
}
