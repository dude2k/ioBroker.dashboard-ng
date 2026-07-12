import { MonitorCog, Palette, X } from "lucide-react";
import { useState } from "react";
import type { DashboardProject, ThemeTokens } from "@dashboard-ng/shared";

interface ProjectSettingsPanelProps {
  project: DashboardProject;
  onChange(project: DashboardProject, status: string): void;
  onClose(): void;
}

type Tab = "appearance" | "viewer";

export function ProjectSettingsPanel({ project, onChange, onClose }: ProjectSettingsPanelProps) {
  const [tab, setTab] = useState<Tab>("appearance");
  const theme =
    project.themes.find((item) => item.themeId === project.settings.activeThemeId) ??
    project.themes[0];
  const activePage = project.pages.find((page) => page.pageId === project.settings.activePageId);

  if (!theme) {
    return null;
  }
  const themeId = theme.themeId;

  function updateTheme(mutator: (tokens: ThemeTokens) => ThemeTokens, status: string) {
    onChange(
      {
        ...project,
        themes: project.themes.map((item) =>
          item.themeId === themeId ? { ...item, tokens: mutator(item.tokens) } : item,
        ),
      },
      status,
    );
  }

  function updateSetting<K extends keyof DashboardProject["settings"]>(
    key: K,
    value: DashboardProject["settings"][K],
  ) {
    onChange(
      { ...project, settings: { ...project.settings, [key]: value } },
      "Viewer settings updated",
    );
  }

  return (
    <section className="project-settings-panel" aria-label="Project settings">
      <header className="library-header">
        <strong>Project settings</strong>
        <button title="Close project settings" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="library-tabs">
        <button
          className={tab === "appearance" ? "is-active" : ""}
          onClick={() => setTab("appearance")}
        >
          <Palette size={15} />
          <span>Appearance</span>
        </button>
        <button className={tab === "viewer" ? "is-active" : ""} onClick={() => setTab("viewer")}>
          <MonitorCog size={15} />
          <span>Viewer</span>
        </button>
      </div>

      {tab === "appearance" ? (
        <div className="settings-content">
          <label className="field">
            <span className="field-label">Theme</span>
            <select
              value={theme.themeId}
              onChange={(event) =>
                onChange(
                  {
                    ...project,
                    settings: { ...project.settings, activeThemeId: event.target.value },
                  },
                  "Theme selected",
                )
              }
            >
              {project.themes.map((item) => (
                <option key={item.themeId} value={item.themeId}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="settings-group">
            <div className="section-title">Colors</div>
            <div className="color-control-grid">
              <ColorControl
                label="Accent"
                value={theme.tokens.colors.accent}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, accent: value } }),
                    "Accent updated",
                  )
                }
              />
              <ColorControl
                label="Background"
                value={theme.tokens.colors.background}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, background: value } }),
                    "Background updated",
                  )
                }
              />
              <ColorControl
                label="Cards"
                value={theme.tokens.colors.surface}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, surface: value } }),
                    "Card color updated",
                  )
                }
              />
              <ColorControl
                label="Text"
                value={theme.tokens.colors.text}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, text: value } }),
                    "Text color updated",
                  )
                }
              />
              <ColorControl
                label="Muted text"
                value={theme.tokens.colors.mutedText}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, mutedText: value } }),
                    "Muted text updated",
                  )
                }
              />
              <ColorControl
                label="Border"
                value={theme.tokens.colors.border}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, colors: { ...tokens.colors, border: value } }),
                    "Border color updated",
                  )
                }
              />
            </div>
          </div>

          <div className="settings-group">
            <div className="section-title">Shape and spacing</div>
            <div className="settings-number-grid">
              <NumberControl
                label="Radius"
                value={theme.tokens.radius.medium}
                min={0}
                max={24}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, radius: { ...tokens.radius, medium: value } }),
                    "Radius updated",
                  )
                }
              />
              <NumberControl
                label="Card padding"
                value={theme.tokens.spacing.cardPadding}
                min={4}
                max={40}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, spacing: { ...tokens.spacing, cardPadding: value } }),
                    "Card spacing updated",
                  )
                }
              />
              <NumberControl
                label="Page padding"
                value={theme.tokens.spacing.pagePadding}
                min={4}
                max={48}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, spacing: { ...tokens.spacing, pagePadding: value } }),
                    "Page spacing updated",
                  )
                }
              />
              <NumberControl
                label="Border width"
                value={theme.tokens.border.width}
                min={0}
                max={4}
                onChange={(value) =>
                  updateTheme(
                    (tokens) => ({ ...tokens, border: { ...tokens.border, width: value } }),
                    "Border width updated",
                  )
                }
              />
            </div>
          </div>

          <div className="settings-group">
            <div className="section-title">Typography and shadow</div>
            <NumberControl
              label="Base size"
              value={theme.tokens.typography.baseSize}
              min={12}
              max={22}
              onChange={(value) =>
                updateTheme(
                  (tokens) => ({
                    ...tokens,
                    typography: { ...tokens.typography, baseSize: value },
                  }),
                  "Typography updated",
                )
              }
            />
            <NumberControl
              label="Type scale"
              value={theme.tokens.typography.scale}
              min={1}
              max={1.5}
              step={0.02}
              onChange={(value) =>
                updateTheme(
                  (tokens) => ({ ...tokens, typography: { ...tokens.typography, scale: value } }),
                  "Typography scale updated",
                )
              }
            />
            <label className="field">
              <span className="field-label">Card shadow</span>
              <input
                value={theme.tokens.shadow.card}
                onChange={(event) =>
                  updateTheme(
                    (tokens) => ({
                      ...tokens,
                      shadow: { ...tokens.shadow, card: event.target.value },
                    }),
                    "Card shadow updated",
                  )
                }
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="settings-content">
          <Toggle
            label="Kiosk behavior"
            description="Keep viewer controls discreet while the dashboard stays focused."
            checked={project.settings.kiosk}
            onChange={(value) => updateSetting("kiosk", value)}
          />
          <Toggle
            label="Wake Lock"
            description="Keep supported displays awake while the dashboard is visible."
            checked={project.settings.wakeLock}
            onChange={(value) => updateSetting("wakeLock", value)}
          />
          <Toggle
            label="Burn-in protection"
            description="Periodically shifts the dashboard by a few pixels."
            checked={project.settings.burnInProtection}
            onChange={(value) => updateSetting("burnInProtection", value)}
          />
          <Toggle
            label="Hide page navigation"
            description="Applies to the active page only."
            checked={Boolean(activePage?.settings.hideNavigation)}
            onChange={(value) =>
              activePage &&
              onChange(
                {
                  ...project,
                  pages: project.pages.map((page) =>
                    page.pageId === activePage.pageId
                      ? { ...page, settings: { ...page.settings, hideNavigation: value } }
                      : page,
                  ),
                },
                "Page navigation updated",
              )
            }
          />
          <Toggle
            label="Page kiosk mode"
            description="Applies the kiosk treatment to the active page."
            checked={Boolean(activePage?.settings.kiosk)}
            onChange={(value) =>
              activePage &&
              onChange(
                {
                  ...project,
                  pages: project.pages.map((page) =>
                    page.pageId === activePage.pageId
                      ? { ...page, settings: { ...page.settings, kiosk: value } }
                      : page,
                  ),
                },
                "Page kiosk updated",
              )
            }
          />
        </div>
      )}
    </section>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="color-control">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      <code>{value}</code>
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange(value: number): void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))
        }
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="settings-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}
