document.addEventListener('DOMContentLoaded', () => {
    // --- Core UI Elements ---
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const browseFilesSpan = document.querySelector('.browse-files');
    const uploadedFileList = document.getElementById('uploaded-file-list');
    const compressButton = document.getElementById('compressButton');
    const clearQueueButton = document.getElementById('clearQueueButton');

    // --- Compression Settings Elements ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const presetRadioButtons = document.querySelectorAll('input[name="compressionPreset"]');
    const compressionQualitySlider = document.getElementById('compressionQualitySlider');
    const qualityValueDisplay = document.getElementById('qualityValueDisplay');
    const optimizeForWebCheckbox = document.getElementById('optimizeForWeb');
    const removeMetadataCheckbox = document.getElementById('removeMetadata');

    // --- Output Sections ---
    const processingQueueSection = document.getElementById('processing-queue-section');
    const compressedOutputSection = document.getElementById('compressed-output-section');
    const resultsContainer = document.getElementById('results-container');

    // --- Queue Summary Elements ---
    const queueStatusDisplay = document.getElementById('queueStatus');
    const processedCountDisplay = document.getElementById('processedCount');
    const totalQueueCountDisplay = document.getElementById('totalQueueCount');
    const queueProgressBar = document.getElementById('queueProgressBar');

    // --- Overall Compression Summary Elements ---
    const totalOriginalSizeSpan = document.getElementById('totalOriginalSize');
    const totalCompressedSizeSpan = document.getElementById('totalCompressedSize');
    const totalSavedMemorySpan = document.getElementById('totalSavedMemory');
    const totalCompressionRatioSpan = document.getElementById('totalCompressionRatio');
    const downloadAllButton = document.getElementById('downloadAllButton');

    // --- Modal Elements ---
    const comparisonModal = document.getElementById('comparisonModal');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalComparisonContainer = document.getElementById('modalComparisonContainer');
    const modalCanvas = document.getElementById('modalCanvas');
    const modalCtx = modalCanvas.getContext('2d');
    const modalSlider = modalComparisonContainer.querySelector('.img-comparison-slider');
    
    // Store loaded images for modal to avoid re-loading
    let modalOriginalImage = new Image();
    let modalCompressedImage = new Image();

    let uploadedFiles = [];
    let currentQuality;
    let isProcessingQueue = false;

    // --- Configuration Constants ---
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const SIMULATED_PROCESSING_DELAY_PER_ITEM_MS = 500;
    
    // !!! FINAL CHANGE HERE !!!
    // We are now using dynamic, but consistent, placeholder images from picsum.photos.
    // These are generally CORS-friendly and will reliably load.
    // The 'id' parameter helps simulate different images.
    const PLACEHOLDER_ORIGINAL_BASE_URL = 'https://picsum.photos/id/';
    const PLACEHOLDER_COMPRESSED_BASE_URL = 'https://picsum.photos/id/';
    const PLACEHOLDER_IMAGE_WIDTH = 200; // For thumbnails
    const PLACEHOLDER_IMAGE_HEIGHT = 150; // For thumbnails
    const PLACEHOLDER_MODAL_WIDTH = 800; // For modal
    const PLACEHOLDER_MODAL_HEIGHT = 600; // For modal

    // Fallback image URL (a tiny transparent pixel) if even placeholders fail
    const FALLBACK_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    // --- Utility Functions (unchanged) ---

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // --- Tab Switching Logic (unchanged) ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${targetTab}-tab-content`).classList.add('active');

            if (targetTab === 'custom') {
                compressionQualitySlider.value = currentQuality;
                qualityValueDisplay.textContent = `${currentQuality}%`;
            } else if (targetTab === 'presets') {
                const checkedPreset = document.querySelector('input[name="compressionPreset"]:checked');
                if (checkedPreset) {
                    currentQuality = parseInt(checkedPreset.value);
                } else {
                    currentQuality = 75;
                    document.querySelector('input[name="compressionPreset"][value="75"]').checked = true;
                }
                qualityValueDisplay.textContent = `${currentQuality}%`;
            }
            if (uploadedFiles.length > 0) {
                console.log("Triggering compression from tab change.");
                initiateCompression();
            }
        });
    });

    // --- Preset Radio Button Handlers (unchanged) ---
    presetRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentQuality = parseInt(radio.value);
                compressionQualitySlider.value = currentQuality;
                qualityValueDisplay.textContent = `${currentQuality}%`;
                if (uploadedFiles.length > 0) {
                    console.log("Triggering compression from preset radio change.");
                    initiateCompression();
                }
            }
        });
    });

    // --- Custom Slider Handler (unchanged) ---
    compressionQualitySlider.addEventListener('input', () => {
        currentQuality = parseInt(compressionQualitySlider.value);
        qualityValueDisplay.textContent = `${currentQuality}%`;
        presetRadioButtons.forEach(radio => radio.checked = false);
        if (uploadedFiles.length > 0) {
            console.log("Triggering compression from custom slider change.");
            initiateCompression();
        }
    });

    // --- Advanced Options Checkbox Handlers (unchanged) ---
    [optimizeForWebCheckbox, removeMetadataCheckbox].forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (uploadedFiles.length > 0) {
                console.log("Triggering compression from advanced option change.");
                initiateCompression();
            }
        });
    });

    // --- Initial Quality Setup (unchanged) ---
    const defaultCheckedRadio = document.querySelector('input[name="compressionPreset"]:checked');
    if (defaultCheckedRadio) {
        currentQuality = parseInt(defaultCheckedRadio.value);
    } else {
        currentQuality = 75;
        document.querySelector('input[name="compressionPreset"][value="75"]').checked = true;
    }
    compressionQualitySlider.value = currentQuality;
    qualityValueDisplay.textContent = `${currentQuality}%`;


    // --- Drag and Drop Handlers (unchanged) ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // --- File Input Handlers ---
    browseFilesSpan.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });

    // --- Main File Handling Logic (validation, preview, queueing) ---
    async function handleFiles(files) {
        compressedOutputSection.style.display = 'none';
        processingQueueSection.style.display = 'none';
        resultsContainer.innerHTML = '';
        downloadAllButton.setAttribute('disabled', 'true');
        clearQueueButton.style.display = 'none';
        uploadedFileList.innerHTML = '';
        uploadedFiles = [];

        let newFilesPromises = [];

        for (const file of files) { // Use for...of to ensure sequential processing or proper error handling
            if (!(file.type === 'image/jpeg' || file.type === 'image/jpg')) {
                alert(`File "${file.name}" is not a JPEG image and will be ignored.`);
                console.warn(`Skipping non-JPEG file: ${file.name}`);
                continue; // Use continue to skip to next file in loop
            }

            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`File "${file.name}" (${formatBytes(file.size)}) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB and will be ignored.`);
                console.warn(`Skipping oversized file: ${file.name} (${formatBytes(file.size)})`);
                continue;
            }

            const isDuplicate = uploadedFiles.some(
                (existingFile) => existingFile.file.name === file.name && existingFile.file.size === file.size
            );

            if (isDuplicate) {
                console.warn(`Skipping duplicate file: ${file.name}`);
                continue;
            }

            // Generate a unique ID for this image (e.g., from picsum.photos)
            const imageId = Math.floor(Math.random() * 1000) + i; // i ensures different image for each file

            const fileEntry = {
                file: file,
                // These are now external URLs, derived from picsum.photos
                originalUrl: `${PLACEHOLDER_ORIGINAL_BASE_URL}${imageId}/${PLACEHOLDER_IMAGE_WIDTH}/${PLACEHOLDER_IMAGE_HEIGHT}`,
                originalSize: file.size, // Original size from uploaded file
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'queued',
                compressedUrl: `${PLACEHOLDER_COMPRESSED_BASE_URL}${imageId + 1000}/${PLACEHOLDER_IMAGE_WIDTH}/${PLACEHOLDER_IMAGE_HEIGHT}`, // Different ID for 'compressed' to simulate visual difference
                compressedSize: null, // Will be simulated by backend logic
            };
            uploadedFiles.push(fileEntry);
            addFileToListDisplay(fileEntry); // Update file list UI immediately
            updateImagePairResult(fileEntry); // Update the row with the newly assigned URLs

            // No need for FileReaderPromise or uploadPromise anymore, as URLs are directly assigned.
            // All images will be considered "loaded" for their initial display at this point.
            newFilesPromises.push(Promise.resolve()); // Push a resolved promise to satisfy allSettled.
        }

        await Promise.allSettled(newFilesPromises); // Still wait for all "initial loads" to be processed.
        console.log("[handleFiles] All file URLs assigned. Proceeding to initiateCompression.");
        initiateCompression();
        updateCompressButtonState();
        fileInput.value = '';
    }

    function addFileToListDisplay(fileEntry) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', fileEntry.id);
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.classList.add('file-name');
        fileNameSpan.textContent = fileEntry.file.name;

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn-list');
        removeBtn.textContent = 'X';
        removeBtn.title = `Remove ${fileEntry.file.name}`;
        removeBtn.addEventListener('click', () => removeFile(fileEntry.id, listItem));

        listItem.appendChild(fileNameSpan);
        listItem.appendChild(removeBtn);
        uploadedFileList.appendChild(listItem);
    }

    function removeFile(idToRemove, listItemElement) {
        uploadedFiles = uploadedFiles.filter(fileEntry => fileEntry.id !== idToRemove);
        listItemElement.remove();
        updateCompressButtonState();

        const resultRowToRemove = document.querySelector(`.image-pair-row[data-id="${idToRemove}"]`);
        if (resultRowToRemove) {
            resultRowToRemove.remove();
        }

        if (uploadedFiles.length === 0) {
            console.log("No files left, hiding all sections.");
            compressedOutputSection.style.display = 'none';
            processingQueueSection.style.display = 'none';
            resultsContainer.innerHTML = '';
            downloadAllButton.setAttribute('disabled', 'true');
            clearQueueButton.style.display = 'none';
        } else {
            console.log("Files removed, re-triggering compression for remaining files.");
            if (!isProcessingQueue) {
                initiateCompression();
            } else {
                updateTotalStats();
            }
        }
    }

    function updateCompressButtonState() {
        if (uploadedFiles.length > 0 && !isProcessingQueue) {
            compressButton.removeAttribute('disabled');
        } else {
            compressButton.setAttribute('disabled', 'true');
        }
    }

    function updateQueueProgress(current, total) {
        processedCountDisplay.textContent = current;
        const progress = (current / total) * 100;
        queueProgressBar.style.width = `${progress}%`;
    }

    function updateTotalStats() {
        let totalOriginal = 0;
        let totalCompressed = 0;
        uploadedFiles.filter(f => f.status === 'completed').forEach(fileEntry => {
            totalOriginal += fileEntry.originalSize;
            totalCompressed += fileEntry.compressedSize;
        });

        totalOriginalSizeSpan.textContent = formatBytes(totalOriginal);
        totalCompressedSizeSpan.textContent = formatBytes(totalCompressed);
        const savedMemory = totalOriginal - totalCompressed;
        totalSavedMemorySpan.textContent = formatBytes(savedMemory);
        const overallReduction = totalOriginal > 0 ? ((totalOriginal - totalCompressed) / totalOriginal) * 100 : 0;
        totalCompressionRatioSpan.textContent = `${overallReduction.toFixed(1)}%`;
    }

    // --- Client-side re-compression for visual comparison (REMOVED as URLs come from backend concept) ---
    // This function is no longer needed.

    async function initiateCompression() {
        if (isProcessingQueue || uploadedFiles.length === 0) {
            updateCompressButtonState();
            if (uploadedFiles.length === 0) {
                compressedOutputSection.style.display = 'none';
                processingQueueSection.style.display = 'none';
                resultsContainer.innerHTML = '';
                downloadAllButton.setAttribute('disabled', 'true');
                clearQueueButton.style.display = 'none';
            }
            return;
        }

        isProcessingQueue = true;
        compressButton.setAttribute('disabled', 'true');
        uploadedFileList.querySelectorAll('.remove-btn-list').forEach(btn => btn.style.display = 'none');
        clearQueueButton.style.display = 'inline-block';

        processingQueueSection.style.display = 'block';
        compressedOutputSection.style.display = 'block';

        resultsContainer.innerHTML = ''; // Clear previous compression results display

        let processedCount = 0;
        const totalItems = uploadedFiles.length;
        totalQueueCountDisplay.textContent = totalItems;
        queueStatusDisplay.textContent = 'Processing...';
        queueProgressBar.style.width = '0%';

        // Ensure all UI elements are set to 'queued' state and initial previews are set up
        for (const fileEntry of uploadedFiles) {
            fileEntry.status = 'queued'; // Reset status for potential re-runs
            fileEntry.compressedSize = null; // Clear previous compressed size
            
            // Re-create rows here to ensure clean state and show current URLs
            createImagePairResult(fileEntry);
        }

        const quality = currentQuality;
        const optimizeForWeb = optimizeForWebCheckbox.checked;
        const removeMetadata = removeMetadataCheckbox.checked;

        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileEntry = uploadedFiles[i];

            // If file is queued, proceed with "compression" (simulated backend processing)
            if (fileEntry.status === 'queued') {
                fileEntry.status = 'processing';
                updateImagePairResult(fileEntry); // Update UI to 'processing'

                await new Promise(resolve => setTimeout(resolve, SIMULATED_PROCESSING_DELAY_PER_ITEM_MS)); // Simulate backend compression time

                try {
                    // Simulate backend response for compressed size/ratio
                    // In a real app, this data would come from your backend.
                    const minAllowedQuality = 10;
                    const maxAllowedQuality = 100;
                    let targetMinReduction = 0.05;
                    let targetMaxReduction = 0.90;

                    // Adjust simulated reduction based on quality
                    const normalizedQuality = (quality - minAllowedQuality) / (maxAllowedQuality - minAllowedQuality);
                    const simulatedReductionRatio = targetMaxReduction - (normalizedQuality * (targetMaxReduction - targetMinReduction));
                    const simulatedCompressedSize = fileEntry.originalSize * (1 - simulatedReductionRatio);

                    fileEntry.compressedSize = Math.max(1, Math.round(simulatedCompressedSize));
                    // fileEntry.originalUrl and fileEntry.compressedUrl are already set by handleFiles
                    fileEntry.status = 'completed';
                    
                } catch (error) {
                    console.error(`Failed to simulate compression process for "${fileEntry.file.name}":`, error);
                    fileEntry.status = 'failed';
                }
            } else {
                 console.log(`Skipping compression for "${fileEntry.file.name}" as it's already ${fileEntry.status}.`);
            }
            
            updateImagePairResult(fileEntry); // Reflect final status and results in UI
            processedCount++;
            updateQueueProgress(processedCount, totalItems);
        }

        isProcessingQueue = false;
        queueStatusDisplay.textContent = 'Completed!';
        downloadAllButton.removeAttribute('disabled');
        compressButton.textContent = 'Compress Images';
        updateCompressButtonState();
        uploadedFileList.querySelectorAll('.remove-btn-list').forEach(btn => btn.style.display = 'flex');

        updateTotalStats();
        console.log("Compression batch completed.");
    }

    // --- Creates the initial HTML structure for an image's side-by-side result display ---
    function createImagePairResult(fileEntry) {
        const imagePairRow = document.createElement('div');
        imagePairRow.classList.add('image-pair-row');
        imagePairRow.setAttribute('data-id', fileEntry.id);
        imagePairRow.setAttribute('data-status', fileEntry.status); // Initial status

        // Original Image Box
        const originalBox = document.createElement('div');
        originalBox.classList.add('image-display-box', 'original');
        originalBox.innerHTML = `
            <h4>Original</h4>
            <div class="img-wrapper loading">
                <img src="${fileEntry.originalUrl || ''}" alt="${fileEntry.file.name}" style="display: none;">
                <span class="loading-text">Loading Original...</span>
            </div>
            <div class="file-stats">
                <span class="file-name-display">${fileEntry.file.name}</span>
                <p><strong>Size:</strong> ${formatBytes(fileEntry.originalSize)}</p>
            </div>
        `;
        imagePairRow.appendChild(originalBox);

        // Compressed Image Box (Static Thumbnail with Click-to-Compare Overlay)
        const compressedBox = document.createElement('div');
        compressedBox.classList.add('image-display-box', 'compressed');
        compressedBox.innerHTML = `
            <h4>Compressed</h4>
            <div class="img-wrapper loading">
                <img src="${fileEntry.compressedUrl || ''}" alt="Compressed Image" style="display: none;">
                <span class="loading-text">Processing...</span>
                <div class="img-comparison-overlay">Click to Compare</div>
            </div>
            <div class="file-stats">
                <span class="file-name-display">${fileEntry.file.name}</span>
                <p><strong>Status:</strong> <span class="current-item-status">${fileEntry.status}</span></p>
                <p><strong>Size:</strong> <span class="value compressed-size-display">--</span></p>
                <p><strong>Saved:</strong> <span class="value saved-memory-display">--</span></p>
                <p><strong>Reduction:</strong> <span class="value reduction-display">--</span></p>
            </div>
            <button class="download-single-button" data-id="${fileEntry.id}" disabled>Download</button>
        `;
        imagePairRow.appendChild(compressedBox);

        resultsContainer.appendChild(imagePairRow);

        // Attach the click listener to the overlay for modal activation
        const imgComparisonOverlay = compressedBox.querySelector('.img-comparison-overlay');
        if (imgComparisonOverlay) {
            imgComparisonOverlay.addEventListener('click', () => {
                if (fileEntry.status === 'completed' && !compressedBox.classList.contains('error')) {
                    showModalComparison(fileEntry);
                }
            });
        }

        // Initial update to attach error handlers and set visibility based on initial fileEntry state
        updateImagePairResult(fileEntry); 
    }

    // --- Updates an existing image's result display based on its current state ---
    function updateImagePairResult(fileEntry) {
        const row = document.querySelector(`.image-pair-row[data-id="${fileEntry.id}"]`);
        if (!row) {
            console.warn(`[updateImagePairResult] Row with ID ${fileEntry.id} not found in DOM.`);
            return;
        }

        row.setAttribute('data-status', fileEntry.status);

        const statusDisplay = row.querySelector('.current-item-status');
        const compressedSizeDisplay = row.querySelector('.compressed-size-display');
        const savedMemoryDisplay = row.querySelector('.saved-memory-display');
        const reductionDisplay = row.querySelector('.reduction-display');
        const downloadSingleBtn = row.querySelector('.download-single-button');
        
        const originalImgWrapper = row.querySelector('.image-display-box.original .img-wrapper');
        const compressedImgWrapper = row.querySelector('.image-display-box.compressed .img-wrapper');

        // Get elements for direct manipulation
        const originalImg = originalImgWrapper.querySelector('img');
        const loadingTextOriginal = originalImgWrapper.querySelector('.loading-text');

        const compressedThumbnailImg = compressedImgWrapper.querySelector('img'); // This is the static thumbnail img
        const loadingTextCompressed = compressedImgWrapper.querySelector('.loading-text');
        const imgComparisonOverlay = compressedImgWrapper.querySelector('.img-comparison-overlay');


        statusDisplay.textContent = fileEntry.status;

        // Reset general visual states
        originalImgWrapper.classList.remove('loading', 'error');
        compressedImgWrapper.classList.remove('loading', 'error');
        loadingTextOriginal.style.display = 'none';
        loadingTextCompressed.style.display = 'none';
        originalImg.style.display = 'none'; // Hidden by default
        compressedThumbnailImg.style.display = 'none'; // Hidden by default
        if (imgComparisonOverlay) imgComparisonOverlay.style.display = 'none'; // Hide overlay by default


        // Attach/re-attach error handlers for direct image loading (CRITICAL for debugging)
        originalImg.onerror = () => {
            console.error(`[updateImagePairResult] Image Load Error: Original thumbnail failed for "${fileEntry.file.name}" (ID: ${fileEntry.id}).`);
            originalImgWrapper.classList.add('error');
            loadingTextOriginal.textContent = 'Error Original Image.';
            loadingTextOriginal.style.display = 'block';
            originalImg.style.display = 'none'; // Hide img
            fileEntry.status = 'failed';
            updateImagePairResult(fileEntry); // Recursive update to failed state
        };
        compressedThumbnailImg.onerror = () => {
            console.error(`[updateImagePairResult] Image Load Error: Compressed thumbnail failed for "${fileEntry.file.name}" (ID: ${fileEntry.id}).`);
            compressedImgWrapper.classList.add('error');
            loadingTextCompressed.textContent = 'Error Compressed Image.';
            loadingTextCompressed.style.display = 'block';
            compressedThumbnailImg.style.display = 'none'; // Hide img
            fileEntry.status = 'failed';
            updateImagePairResult(fileEntry); // Recursive update to failed state
        };


        if (fileEntry.status === 'completed') {
            const savedBytes = fileEntry.originalSize - fileEntry.compressedSize;
            const compressionRatio = (savedBytes / fileEntry.originalSize) * 100;

            compressedSizeDisplay.textContent = formatBytes(fileEntry.compressedSize);
            savedMemoryDisplay.textContent = formatBytes(savedBytes);
            reductionDisplay.textContent = `${compressionRatio.toFixed(1)}%`;
            downloadSingleBtn.removeAttribute('disabled');

            // Display original image
            if (fileEntry.originalUrl) {
                originalImg.src = fileEntry.originalUrl;
                originalImg.alt = fileEntry.file.name;
                originalImg.style.display = 'block'; 
            } else {
                 console.error(`[updateImagePairResult] CRITICAL: Original URL missing for ID: ${fileEntry.id} on completion. Cannot display original. Marking as error.`);
                 originalImgWrapper.classList.add('error');
                 loadingTextOriginal.textContent = 'Original data missing.';
                 loadingTextOriginal.style.display = 'block';
                 originalImg.style.display = 'none';
                 fileEntry.status = 'failed';
                 updateImagePairResult(fileEntry);
                 return;
            }

            // Display compressed thumbnail (static view)
            if (fileEntry.compressedUrl) {
                compressedThumbnailImg.src = fileEntry.compressedUrl; 
                compressedThumbnailImg.alt = `Compressed ${fileEntry.file.name}`;
                compressedThumbnailImg.style.display = 'block'; // Show the compressed image
                
                // Show click-to-compare overlay for the thumbnail
                if (imgComparisonOverlay) {
                    imgComparisonOverlay.style.display = 'flex'; // Show overlay
                    compressedImgWrapper.style.cursor = 'pointer'; // Indicate clickable
                }
                
            } else { 
                 console.error(`[updateImagePairResult] CRITICAL: Completed but missing compressed URL for ID: ${fileEntry.id}. Cannot display compressed thumbnail. Marking as error.`);
                 compressedImgWrapper.classList.add('error');
                 loadingTextCompressed.textContent = 'Image data missing.';
                 loadingTextCompressed.style.display = 'block';
                 compressedThumbnailImg.style.display = 'none';
                 downloadSingleBtn.setAttribute('disabled', 'true');
                 fileEntry.status = 'failed';
                 updateImagePairResult(fileEntry);
                 return;
            }


        } else if (fileEntry.status === 'failed') {
            compressedSizeDisplay.textContent = 'Error';
            savedMemoryDisplay.textContent = 'Error';
            reductionDisplay.textContent = 'Error';
            downloadSingleBtn.setAttribute('disabled', 'true');
            
            originalImgWrapper.classList.add('error');
            loadingTextOriginal.textContent = 'Error Original Image.';
            loadingTextOriginal.style.display = 'block';
            originalImg.style.display = 'none';

            compressedImgWrapper.classList.add('error');
            loadingTextCompressed.textContent = 'Error Processing Image.';
            loadingTextCompressed.style.display = 'block';
            compressedThumbnailImg.src = '';
            compressedThumbnailImg.style.display = 'none';

        } else { // 'queued' or 'processing'
            originalImgWrapper.classList.add('loading');
            loadingTextOriginal.textContent = 'Loading Original...';
            loadingTextOriginal.style.display = 'block';
            originalImg.src = fileEntry.originalUrl || '';
            originalImg.style.display = 'none';

            compressedImgWrapper.classList.add('loading');
            loadingTextCompressed.textContent = 'Processing...';
            loadingTextCompressed.style.display = 'block';
            compressedThumbnailImg.src = '';
            compressedThumbnailImg.style.display = 'none';
        }
    }


    // --- Image Comparison Slider Functionality (for the MODAL only) ---
    function setupImageComparisonSlider(container) {
        // Prevent re-initialization if already set up for this container
        if (container.dataset.sliderInitialized === 'true') {
            return; 
        }
        container.dataset.sliderInitialized = 'true'; // Mark as initialized

        const slider = container.querySelector('.img-comparison-slider');
        const canvas = container.querySelector('.modal-canvas'); // Get the canvas element
        const ctx = canvas.getContext('2d');

        // NEW: Add labels to the modal comparison container
        if (!container.querySelector('.label-original')) { // Check if labels already exist
            const labelOriginal = document.createElement('span');
            labelOriginal.classList.add('comparison-label', 'label-original');
            labelOriginal.textContent = 'Original';
            container.appendChild(labelOriginal);

            const labelCompressed = document.createElement('span');
            labelCompressed.classList.add('comparison-label', 'label-compressed');
            labelCompressed.textContent = 'Compressed';
            container.appendChild(labelCompressed);
        }

        function onMouseMove(e) {
            if (!isDragging) return;

            const containerRect = container.getBoundingClientRect();
            let x = e.clientX - containerRect.left;

            if (x < 0) x = 0;
            if (x > containerRect.width) x = containerRect.width;

            slider.style.left = `${x}px`; // Position the slider handle
            drawComparison(x); // Redraw canvas based on new slider position
        }

        function onMouseUp() {
            isDragging = false;
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mouseup', onMouseUp);
            container.classList.remove('dragging');
        }

        slider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            container.addEventListener('mousemove', onMouseMove);
            container.addEventListener('mouseup', onMouseUp);
            container.classList.add('dragging');

            const containerRect = container.getBoundingClientRect();
            let initialX = e.clientX - containerRect.left;
            slider.style.left = `${initialX}px`;
            drawComparison(initialX); // Initial draw on click
        });

        // Initial draw (50% split) - This will be called after images are loaded
        // drawComparison(canvas.width / 2); // Commented out, called after load
        
        // Position the slider handle
        slider.style.left = `50%`;
        slider.style.display = 'block';

        // Handle touch events for mobile (adapted for canvas drawing)
        function onTouchMove(e) {
            if (!isDragging || !e.touches || e.touches.length === 0) return;

            const containerRect = container.getBoundingClientRect();
            let x = e.touches[0].clientX - containerRect.left;

            if (x < 0) x = 0;
            if (x > containerRect.width) x = containerRect.width;

            slider.style.left = `${x}px`;
            drawComparison(x); // Redraw canvas based on new slider position
        }

        function onTouchEnd() {
            isDragging = false;
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
            container.classList.remove('dragging');
        }

        slider.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            isDragging = true;
            container.addEventListener('touchmove', onTouchMove);
            container.addEventListener('touchend', onTouchEnd);
            container.classList.add('dragging');

            if (!e.touches || e.touches.length === 0) return;

            const containerRect = container.getBoundingClientRect();
            let initialX = e.touches[0].clientX - containerRect.left;
            slider.style.left = `${initialX}px`;
            drawComparison(initialX);
        });

        // Expose loadImage function to showModalComparison
        container.loadImage = loadImagesForCanvas;
        // Also expose drawComparison for initial setup after load
        container.drawComparison = drawComparison;
    }

    // --- Modal Control Functions ---
    async function showModalComparison(fileEntry) {
        modalTitle.textContent = `Comparing: ${fileEntry.file.name}`;
        
        // Ensure initial clear state for canvas
        modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalCtx.fillStyle = '#f0f0f0'; // Light grey placeholder
        modalCtx.fillRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalCtx.fillStyle = '#666';
        modalCtx.font = '20px sans-serif';
        modalCtx.textAlign = 'center';
        modalCtx.textBaseline = 'middle';
        modalCtx.fillText('Loading Images...', modalCanvas.width / 2, modalCanvas.height / 2);


        // Load images for the canvas comparison
        try {
            await Promise.all([
                new Promise(resolve => { modalOriginalImage.onload = () => resolve(); modalOriginalImage.onerror = () => { console.error("Modal Original Image Load Fail"); modalOriginalImage.src = FALLBACK_IMAGE_URL; resolve(); }; modalOriginalImage.crossOrigin = "anonymous"; modalOriginalImage.src = fileEntry.originalUrl; }),
                new Promise(resolve => { modalCompressedImage.onload = () => resolve(); modalCompressedImage.onerror = () => { console.error("Modal Compressed Image Load Fail"); modalCompressedImage.src = FALLBACK_IMAGE_URL; resolve(); }; modalCompressedImage.crossOrigin = "anonymous"; modalCompressedImage.src = fileEntry.compressedUrl; })
            ]);
            console.log(`[showModalComparison] Images loaded into modal canvases for "${fileEntry.file.name}".`);
            
            // Set canvas size based on original image's natural dimensions
            modalCanvas.width = modalOriginalImage.naturalWidth;
            modalCanvas.height = modalOriginalImage.naturalHeight;

            // Initialize slider and draw comparison
            setupImageComparisonSlider(modalComparisonContainer); // This sets up handlers and draws.
            modalComparisonContainer.drawComparison(modalCanvas.width / 2); // Call its internal draw for initial state

        } catch (error) {
            console.error(`[showModalComparison] Failed to load images for modal comparison for "${fileEntry.file.name}":`, error);
            // Draw error state on canvas
            modalCanvas.width = 600; // Default size if dimensions unknown
            modalCanvas.height = 450;
            modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
            modalCtx.fillStyle = '#ffe6e6';
            modalCtx.fillRect(0, 0, modalCanvas.width, modalCanvas.height);
            modalCtx.fillStyle = '#dc3545';
            modalCtx.font = '24px sans-serif';
            modalCtx.textAlign = 'center';
            modalCtx.textBaseline = 'middle';
            modalCtx.fillText('Error Loading Image', modalCanvas.width / 2, modalCanvas.height / 2);
        }
        
        comparisonModal.classList.add('active'); // Show modal
    }

    function hideModalComparison() {
        comparisonModal.classList.remove('active');
        // Clear canvas content and reset slider position
        modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalSlider.style.left = '50%';
        modalComparisonContainer.dataset.sliderInitialized = 'false'; // Allow re-initialization on next open
        // Images (modalOriginalImage, modalCompressedImage) stay loaded in memory, which is efficient.
    }

    // --- Event Listeners for Modal ---
    closeButton.addEventListener('click', hideModalComparison);
    // Close modal if user clicks outside of the modal content
    comparisonModal.addEventListener('click', (e) => {
        if (e.target === comparisonModal) {
            hideModalComparison();
        }
    });


    function handleSingleDownload(fileEntry) {
        if (fileEntry.status !== 'completed') {
            alert('Image not yet compressed or failed. Please wait.');
            return;
        }
        const link = document.createElement('a');
        link.href = fileEntry.compressedUrl;
        link.download = `compressed_${fileEntry.file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Simulating download for "${fileEntry.file.name}".`);
    }

    downloadAllButton.addEventListener('click', () => {
        const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
        if (completedFiles.length === 0) {
            alert('No compressed images to download!');
            return;
        }
        alert(`Simulating download of all ${completedFiles.length} compressed images.
        (In a real app, this would typically initiate a ZIP file download from the server of only completed files.)`);
    });

    clearQueueButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all uploaded images and results?')) {
            uploadedFiles = [];
            uploadedFileList.innerHTML = '';
            resultsContainer.innerHTML = '';
            compressedOutputSection.style.display = 'none';
            processingQueueSection.style.display = 'none';
            downloadAllButton.setAttribute('disabled', 'true');
            clearQueueButton.style.display = 'none';
            
            updateCompressButtonState();
            queueStatusDisplay.textContent = 'Idle';
            processedCountDisplay.textContent = '0';
            totalQueueCountDisplay.textContent = '0';
            queueProgressBar.style.width = '0%';
            updateTotalStats();
        }
    });

    document.querySelector('.tab-button[data-tab="presets"]').click();
    updateCompressButtonState();

    compressButton.addEventListener('click', initiateCompression);
});
