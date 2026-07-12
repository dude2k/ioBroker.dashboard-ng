import { Download, Image, LayoutTemplate, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  createPageTemplate,
  exportTemplate,
  importTemplate,
  type Asset,
  type DashboardProject,
  type Template,
} from "@dashboard-ng/shared";

interface LibraryPanelProps {
  project: DashboardProject;
  selectedComponentId?: string;
  onApplyTemplate(template: Template): void;
  onChange(project: DashboardProject, status: string): void;
  onStatus(status: string): void;
  onClose(): void;
}

export function LibraryPanel({
  project,
  selectedComponentId,
  onApplyTemplate,
  onChange,
  onStatus,
  onClose,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<"templates" | "assets">("templates");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceKind, setReferenceKind] = useState<Asset["kind"]>("image");
  const templateInput = useRef<HTMLInputElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);
  const activePage = project.pages.find((page) => page.pageId === project.settings.activePageId);

  function saveCurrentPage() {
    if (!activePage) return;
    const name = window.prompt("Template name", `${activePage.name} Template`)?.trim();
    if (!name) return;
    const template = createPageTemplate(project, activePage.pageId, name);
    onChange({ ...project, templates: [...project.templates, template] }, "Template saved");
  }

  async function readTemplate(file?: File) {
    if (!file) return;
    try {
      const template = importTemplate(JSON.parse(await file.text()));
      const templates = project.templates.filter((item) => item.templateId !== template.templateId);
      onChange({ ...project, templates: [...templates, template] }, "Template imported");
    } catch (error) {
      onStatus(`Template import failed: ${readError(error)}`);
    }
  }

  async function readAssets(files: FileList | null) {
    if (!files?.length) return;
    try {
      const assets = await Promise.all([...files].map(fileToAsset));
      onChange(
        { ...project, assets: [...project.assets, ...assets] },
        `${assets.length} asset(s) added`,
      );
    } catch (error) {
      onStatus(`Asset upload failed: ${readError(error)}`);
    }
  }

  function addReference() {
    const url = referenceUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      onStatus("Asset URL must start with http:// or https://");
      return;
    }
    const asset: Asset = {
      assetId: createId("asset"),
      name: url.split("/").pop() || "Referenced asset",
      kind: referenceKind,
      url,
      createdAt: new Date().toISOString(),
    };
    onChange({ ...project, assets: [...project.assets, asset] }, "Asset reference added");
    setReferenceUrl("");
  }

  function applyAsset(asset: Asset, background = false) {
    if (!selectedComponentId || !asset.url) return;
    const components = project.components.map((component) => {
      if (component.componentId !== selectedComponentId) return component;
      return background
        ? { ...component, style: { ...component.style, backgroundImage: asset.url } }
        : { ...component, props: { ...component.props, imageUrl: asset.url } };
    });
    onChange({ ...project, components }, background ? "Background applied" : "Image applied");
  }

  return (
    <section className="library-panel" aria-label="Templates and assets">
      <header className="library-header">
        <strong>Library</strong>
        <button title="Close library" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="library-tabs">
        <button
          className={tab === "templates" ? "is-active" : ""}
          onClick={() => setTab("templates")}
        >
          <LayoutTemplate size={15} />
          <span>Templates</span>
        </button>
        <button className={tab === "assets" ? "is-active" : ""} onClick={() => setTab("assets")}>
          <Image size={15} />
          <span>Assets</span>
        </button>
      </div>

      {tab === "templates" ? (
        <div className="library-content">
          <div className="library-actions">
            <button title="Save active page as template" onClick={saveCurrentPage}>
              <Plus size={15} />
              <span>Save page</span>
            </button>
            <button title="Import template" onClick={() => templateInput.current?.click()}>
              <Upload size={15} />
            </button>
          </div>
          {project.templates.map((template) => (
            <article className="library-item" key={template.templateId}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.metadata.description}</span>
              </div>
              <div className="library-item-actions">
                <button title="Use template" onClick={() => onApplyTemplate(template)}>
                  <Plus size={15} />
                </button>
                <button
                  title="Export template"
                  onClick={() =>
                    downloadJson(exportTemplate(template), `${template.templateId}.json`)
                  }
                >
                  <Download size={15} />
                </button>
                {template.metadata.starter !== "true" ? (
                  <button
                    title="Delete template"
                    onClick={() =>
                      onChange(
                        {
                          ...project,
                          templates: project.templates.filter(
                            (item) => item.templateId !== template.templateId,
                          ),
                        },
                        "Template deleted",
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          <input
            hidden
            ref={templateInput}
            type="file"
            accept="application/json"
            onChange={(event) => void readTemplate(event.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="library-content">
          <div className="library-actions">
            <button title="Upload image assets" onClick={() => assetInput.current?.click()}>
              <Upload size={15} />
              <span>Upload</span>
            </button>
          </div>
          <div className="asset-reference-row">
            <input
              aria-label="Asset URL"
              placeholder="https://..."
              value={referenceUrl}
              onChange={(event) => setReferenceUrl(event.target.value)}
            />
            <select
              aria-label="Asset kind"
              value={referenceKind}
              onChange={(event) => setReferenceKind(event.target.value as Asset["kind"])}
            >
              <option value="image">Image</option>
              <option value="icon">Icon</option>
              <option value="background">Background</option>
            </select>
            <button title="Add asset reference" onClick={addReference}>
              <Plus size={15} />
            </button>
          </div>
          {project.assets.length ? (
            project.assets.map((asset) => (
              <article className="library-item asset-item" key={asset.assetId}>
                {asset.url ? <img src={asset.url} alt="" /> : <Image size={24} />}
                <div>
                  <strong>{asset.name}</strong>
                  <span>
                    {asset.kind}
                    {asset.url?.startsWith("data:") ? " · embedded" : " · referenced"}
                  </span>
                </div>
                <div className="library-item-actions">
                  <button
                    disabled={!selectedComponentId}
                    title="Use as image"
                    onClick={() => applyAsset(asset)}
                  >
                    <Image size={15} />
                  </button>
                  <button
                    disabled={!selectedComponentId}
                    title="Use as background"
                    onClick={() => applyAsset(asset, true)}
                  >
                    <LayoutTemplate size={15} />
                  </button>
                  <button
                    title="Delete asset"
                    onClick={() =>
                      onChange(
                        {
                          ...project,
                          assets: project.assets.filter((item) => item.assetId !== asset.assetId),
                        },
                        "Asset deleted",
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-panel">No assets</div>
          )}
          <input
            hidden
            multiple
            ref={assetInput}
            type="file"
            accept="image/*,.svg"
            onChange={(event) => void readAssets(event.target.files)}
          />
        </div>
      )}
    </section>
  );
}

function fileToAsset(file: File): Promise<Asset> {
  if (file.size > 5 * 1024 * 1024)
    return Promise.reject(new Error(`${file.name} exceeds the 5 MB asset limit.`));
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg"))
    return Promise.reject(new Error(`${file.name} is not an image.`));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`Cannot read ${file.name}.`));
    reader.onload = () =>
      resolve({
        assetId: createId("asset"),
        name: file.name,
        kind: file.type === "image/svg+xml" || file.name.endsWith(".svg") ? "icon" : "image",
        mimeType: file.type || "image/svg+xml",
        url: String(reader.result),
        createdAt: new Date().toISOString(),
      });
    reader.readAsDataURL(file);
  });
}

function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
