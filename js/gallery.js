const DEFAULT_MANIFEST_PATH = "data/minted_faces.json";

function shortId(inscriptionId) {
  if (typeof inscriptionId !== "string" || inscriptionId.length < 14) {
    return inscriptionId;
  }
  return `${inscriptionId.slice(0, 10)}...${inscriptionId.slice(-6)}`;
}

function validItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.image === "string" &&
    typeof item.inscriptionId === "string" &&
    typeof item.explorerUrl === "string"
  );
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "mint-card";

  const image = document.createElement("img");
  image.src = item.image;
  image.alt = `${item.title} preview`;
  image.loading = "lazy";
  image.decoding = "async";

  const meta = document.createElement("div");
  meta.className = "mint-meta";

  const title = document.createElement("h3");
  title.textContent = item.title;

  const id = document.createElement("code");
  id.title = item.inscriptionId;
  id.textContent = shortId(item.inscriptionId);

  const link = document.createElement("a");
  link.href = item.explorerUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "View on Ordinals";

  meta.append(title, id, link);
  card.append(image, meta);
  return card;
}

function setStatus(statusElement, message, isError = false) {
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

export async function initGallery({
  container,
  statusElement,
  manifestPath = DEFAULT_MANIFEST_PATH
}) {
  if (!container) {
    return;
  }

  setStatus(statusElement, "Loading minted faces...");
  container.innerHTML = "";

  try {
    const response = await fetch(manifestPath, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Manifest request failed (${response.status})`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error("Manifest is not an array.");
    }

    const items = payload.filter(validItem);
    if (items.length === 0) {
      setStatus(statusElement, "No minted faces listed yet.");
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.append(createCard(item)));
    container.append(fragment);
    setStatus(statusElement, `${items.length} minted face(s) loaded.`);
  } catch (error) {
    setStatus(
      statusElement,
      "Could not load gallery manifest. Check data/minted_faces.json.",
      true
    );
    console.error(error);
  }
}
