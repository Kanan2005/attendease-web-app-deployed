import type {
  WebPortalChartShell,
  WebPortalMetric,
  WebPortalMetricTone,
  WebPortalQuickAction,
  WebPortalSpotlightCard,
  WebPortalSpotlightSection,
  WebPortalTableShell,
} from "./web-portal-types"

export function buildMetric(
  label: string,
  value: string,
  tone: WebPortalMetricTone,
): WebPortalMetric {
  return {
    label,
    value,
    tone,
  }
}

export function buildAction(
  href: string,
  label: string,
  description: string,
): WebPortalQuickAction {
  return {
    href,
    label,
    description,
  }
}

export function buildSpotlightCard(
  href: string,
  eyebrow: string,
  title: string,
  description: string,
  ctaLabel: string,
  tone: WebPortalMetricTone,
): WebPortalSpotlightCard {
  return {
    href,
    eyebrow,
    title,
    description,
    ctaLabel,
    tone,
  }
}

export function buildSpotlightSection(
  title: string,
  description: string,
  cards: WebPortalSpotlightCard[],
): WebPortalSpotlightSection {
  return {
    title,
    description,
    cards,
  }
}

export function buildTableShell(
  title: string,
  description: string,
  columns: string[],
  emptyMessage: string,
): WebPortalTableShell {
  return {
    title,
    description,
    columns,
    emptyMessage,
  }
}

export function buildChartShell(
  title: string,
  description: string,
  seriesLabels: string[],
): WebPortalChartShell {
  return {
    title,
    description,
    seriesLabels,
  }
}
