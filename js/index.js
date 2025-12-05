import { db } from "./firebase-init.js";
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const selectBox = document.getElementById("mainAction");
  const formSection = document.getElementById("reviewFormSection");
  const reviewsSection = document.getElementById("reviewsSection");
  const reviewForm = document.getElementById("reviewForm");
  const reviewList = document.getElementById("reviewList");
  const photoInput = document.getElementById("photos");
  const photoPreview = document.getElementById("photoPreview");
  const videoInput = document.getElementById("video");
  const filterCategory = document.getElementById("filterCategory");
  

  // --- Overlay for enlarging images ---
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  overlay.style = `
    position: fixed; display: none; top:0; left:0;
    width:100%; height:100%; background: rgba(0,0,0,0.8);
    justify-content: center; align-items: center; z-index:1000;
  `;
  const overlayImg = document.createElement("img");
  overlayImg.id = "overlay-img";
  overlayImg.style.maxWidth = "90%";
  overlayImg.style.maxHeight = "90%";
  overlay.appendChild(overlayImg);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  // --- Show/Hide sections ---
  selectBox.addEventListener("change", async () => {
    formSection.classList.add("hidden");
    reviewsSection.classList.add("hidden");

    if (selectBox.value === "write") formSection.classList.remove("hidden");
    if (selectBox.value === "read") {
      reviewsSection.classList.remove("hidden");
      await loadReviews();
    }
  });

  // --- Photo & Video Preview with Delete ---
  function setupMediaPreview(photoInput, videoInput, photoPreview) {
    const filesArray = []; // photos
    let videoFile = null;

    function renderPreviews() {
      photoPreview.innerHTML = "";

      // Photos
      filesArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = e => {
          const wrapper = document.createElement("div");
          wrapper.style.position = "relative";
          wrapper.style.display = "inline-block";
          wrapper.style.margin = "5px";

          const img = document.createElement("img");
          img.src = e.target.result;
          img.className = "preview-img";
          img.style.cursor = "pointer";
          img.addEventListener("click", () => {
            overlayImg.src = e.target.result;
            overlay.style.display = "flex";
          });
          wrapper.appendChild(img);

          // Delete button
          const del = document.createElement("span");
          del.innerText = "×";
          del.style.position = "absolute";
          del.style.top = "2px";
          del.style.right = "2px";
          del.style.background = "rgba(255,255,255,0.7)";
          del.style.borderRadius = "50%";
          del.style.padding = "2px 6px";
          del.style.cursor = "pointer";
          del.style.fontWeight = "bold";
          del.addEventListener("click", () => {
            filesArray.splice(index, 1);
            renderPreviews();
          });
          wrapper.appendChild(del);

          photoPreview.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
      });

      // Video
      if (videoFile) {
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.style.margin = "5px";

        const video = document.createElement("video");
        video.src = URL.createObjectURL(videoFile);
        video.controls = true;
        video.style.width = "120px";
        video.style.height = "100px";
        video.style.borderRadius = "10px";
        wrapper.appendChild(video);

        const del = document.createElement("span");
        del.innerText = "×";
        del.style.position = "absolute";
        del.style.top = "2px";
        del.style.right = "2px";
        del.style.background = "rgba(255,255,255,0.7)";
        del.style.borderRadius = "50%";
        del.style.padding = "2px 6px";
        del.style.cursor = "pointer";
        del.style.fontWeight = "bold";
        del.addEventListener("click", () => {
          videoFile = null;
          renderPreviews();
        });
        wrapper.appendChild(del);

        photoPreview.appendChild(wrapper);
      }
    }

    // Photo input
    photoInput.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files).slice(0, 3 - filesArray.length);
      filesArray.push(...newFiles);
      renderPreviews();
      photoInput.value = "";
    });

    // Video input
    videoInput.addEventListener("change", (e) => {
      videoFile = e.target.files[0];
      renderPreviews();
      videoInput.value = "";
    });

    // Drag & Drop
    photoPreview.addEventListener("dragover", (e) => {
      e.preventDefault();
      photoPreview.classList.add("dragover");
    });
    photoPreview.addEventListener("dragleave", (e) => {
      e.preventDefault();
      photoPreview.classList.remove("dragover");
    });
    photoPreview.addEventListener("drop", (e) => {
      e.preventDefault();
      photoPreview.classList.remove("dragover");
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      const allowed = droppedFiles.slice(0, 3 - filesArray.length);
      filesArray.push(...allowed);
      renderPreviews();
    });

    return () => ({ photos: filesArray, video: videoFile });
  }

  const getMediaFiles = setupMediaPreview(photoInput, videoInput, photoPreview);

  // --- Submit Review ---
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { photos, video } = getMediaFiles();

    const name = document.getElementById("name").value;
    const country = document.getElementById("country").value;
    const price = document.getElementById("price").value;
    const place = document.getElementById("place").value;
    const rating = reviewForm.querySelector("select[name='rating']").value;
    const reviewText = document.getElementById("review").value;
    const category = document.getElementById("category").value;

    try {
      const storage = getStorage();
      const photoURLs = [];
      for (let file of photos) {
        const photoRef = ref(storage, `reviews/${Date.now()}_${file.name}`);
        await uploadBytes(photoRef, file);
        photoURLs.push(await getDownloadURL(photoRef));
      }

      let videoURL = "";
      if (video) {
        const videoRef = ref(storage, `reviews/${Date.now()}_${video.name}`);
        await uploadBytes(videoRef, video);
        videoURL = await getDownloadURL(videoRef);
      }

      await addDoc(collection(db, "reviews"), {
        name, country, price, place, rating: Number(rating),
        reviewText, category, photoURLs, videoURL, createdAt: serverTimestamp()
      });

      alert("✅ レビューを保存しました！");
      reviewForm.reset();
      photoPreview.innerHTML = "";
      selectBox.value = "read";
      formSection.classList.add("hidden");
      reviewsSection.classList.remove("hidden");
      await loadReviews();

    } catch (err) {
      console.error("❌ Error saving review:", err);
      alert("レビューの保存に失敗しました。");
    }
  });

  // --- Load Reviews ---
  async function loadReviews(filter = "") {
    reviewList.innerHTML = "<p>📡 読み込み中...</p>";
    try {
      const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      reviewList.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();
        if (filter && data.category !== filter) return;

        const div = document.createElement("div");
        div.classList.add("review-item");

        // --- Basic Info ---
        const hr = document.createElement("hr");
        div.appendChild(hr);

        const fields = [
          ["製品名", data.name],
          ["国", data.country],
          ["価格", `${data.price} 円`],
          ["カテゴリー", data.category],
          ["評価", "★".repeat(data.rating)],
          ["レビュー", data.reviewText]
        ];

        fields.forEach(([label, value]) => {
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.innerText = label + ": ";
          p.appendChild(strong);
          p.appendChild(document.createTextNode(value));
          div.appendChild(p);
        });

        // --- Where to Buy ---
        const placeWrapper = document.createElement("p");
        const placeLabel = document.createElement("strong");
        placeLabel.innerText = "購入場所: ";
        placeWrapper.appendChild(placeLabel);

        const placeText = data.place || "";
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const a = document.createElement("a");

        if (urlPattern.test(placeText)) {
          a.href = placeText;
        } else {
          a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText)}`;
        }
        a.target = "_blank";
        a.rel = "noopener";
        a.innerText = placeText;
        placeWrapper.appendChild(a);
        div.appendChild(placeWrapper);

        // --- Photos ---
        if (data.photoURLs) {
          data.photoURLs.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.style = "max-width:150px; margin:5px; cursor:pointer; border-radius:10px;";
            img.addEventListener("click", () => {
              overlayImg.src = url;
              overlay.style.display = "flex";
            });
            div.appendChild(img);
          });
        }

        // --- Video ---
        if (data.videoURL) {
          const video = document.createElement("video");
          video.src = data.videoURL;
          video.controls = true;
          video.style.maxWidth = "250px";
          video.style.display = "block";
          video.style.marginTop = "10px";
          div.appendChild(video);
        }

        reviewList.appendChild(div);
      });

      translateNewContent();

    } catch (err) {
      console.error("❌ Error loading reviews:", err);
      reviewList.innerHTML = "<p>読み込み失敗しました。</p>";
    }
  }

  // --- Filter Reviews by Category ---
  if (filterCategory) {
    filterCategory.addEventListener("change", () => {
      const cat = filterCategory.value;
      loadReviews(cat);
    });
  }

  // --- Translate dynamic content ---
  function translateNewContent() {
    if (typeof google !== "undefined" && google.translate && google.translate.TranslateElement) {
      document.querySelectorAll('.review-item').forEach(el => {
        el.classList.add('goog-translated');
      });
    }
  }  
});





