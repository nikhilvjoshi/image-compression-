document.addEventListener('DOMContentLoaded', () => {
    // --- Core UI Elements ---
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const browseFilesSpan = document.querySelector('.browse-files');
    const uploadedFileList = document.getElementById('uploaded-file-list'); // List for displaying names
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
    const modalCanvas = document.getElementById('modalCanvas'); // Reference to the canvas element
    const modalCtx = modalCanvas.getContext('2d');
    const modalSlider = modalComparisonContainer.querySelector('.img-comparison-slider'); // Slider handle
    
    // Store loaded images for modal to avoid re-loading
    let modalOriginalImage = new Image();
    let modalCompressedImage = new Image();

    let uploadedFiles = [];
    let currentQuality;
    let isProcessingQueue = false;

    // --- Configuration Constants ---
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const SIMULATED_PROCESSING_DELAY_PER_ITEM_MS = 500; // Longer delay for realistic backend simulation
    // Fallback image for display errors (a tiny transparent pixel)
    const FALLBACK_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    // Dummy URLs for local testing without a backend (REPLACE THESE with your actual backend URLs)
    const DUMMY_ORIGINAL_IMAGE_URL = 'https://via.placeholder.com/800x600/FFC0CB/000000?text=ORIGINAL_IMAGE'; // Larger for modal
    const DUMMY_COMPRESSED_IMAGE_URL = 'https://via.com/800x600/ADD8E6/000000?text=COMPRESSED_IMAGE'; // Larger for modal

    // --- Utility Functions ---

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
    async function handleFiles(files) { // Made async to await FileReader promises
        // Reset UI when a new batch of files is introduced
        compressedOutputSection.style.display = 'none';
        processingQueueSection.style.display = 'none';
        resultsContainer.innerHTML = '';
        downloadAllButton.setAttribute('disabled', 'true');
        clearQueueButton.style.display = 'none';
        uploadedFileList.innerHTML = ''; // Clear the list of uploaded file names
        uploadedFiles = []; // Clear the internal array of file entries

        let newFilesPromises = []; // To hold promises for FileReader results

        [...files].forEach(file => {
            if (!(file.type === 'image/jpeg' || file.type === 'image/jpg')) {
                alert(`File "${file.name}" is not a JPEG image and will be ignored.`);
                console.warn(`Skipping non-JPEG file: ${file.name}`);
                return;
            }

            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`File "${file.name}" (${formatBytes(file.size)}) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB and will be ignored.`);
                console.warn(`Skipping oversized file: ${file.name} (${formatBytes(file.size)})`);
                return;
            }

            const isDuplicate = uploadedFiles.some(
                (existingFile) => existingFile.file.name === file.name && existingFile.file.size === file.size
            );

            if (isDuplicate) {
                console.warn(`Skipping duplicate file: ${file.name}`);
                return;
            }

            const fileEntry = {
                file: file,
                originalUrl: null, // Will be set by backend
                originalSize: file.size,
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'queued',
                compressedUrl: null, // Will be set by backend
                compressedSize: null,
                uploadPromise: null // Promise that resolves when file is "uploaded" and URLs are "acquired"
            };
            uploadedFiles.push(fileEntry);
            addFileToListDisplay(fileEntry); // Update file list UI immediately
            
            // --- Simulate backend upload and URL acquisition ---
            fileEntry.uploadPromise = new Promise((resolve, reject) => {
                // In a real app, you would send 'file' via FormData to your backend.
                // The backend processes it, saves original and compressed, and returns their public URLs.
                // Example: fetch('/upload', { method: 'POST', body: formData })
                setTimeout(() => {
                    if (Math.random() > 0.1) { // 90% success rate for simulation
                        fileEntry.originalUrl = DUMMY_ORIGINAL_IMAGE_URL + `?v=${fileEntry.id}`; // Add unique param to prevent caching
                        fileEntry.compressedUrl = DUMMY_COMPRESSED_IMAGE_URL + `?v=${fileEntry.id}`; // Add unique param
                        console.log(`[handleFiles] Simulated upload for "${file.name}". Original URL: ${fileEntry.originalUrl}, Compressed URL: ${fileEntry.compressedUrl}`);
                        resolve();
                    } else {
                        reject(new Error("Simulated upload/URL acquisition failure."));
                    }
                }, 200); // Simulate network upload delay
            });

            // Handle the resolution/rejection of the upload promise to update UI
            fileEntry.uploadPromise.then(() => {
                updateImagePairResult(fileEntry); // Refresh row to show original image (now that URL is present)
            }).catch(error => {
                console.error(`[handleFiles] Upload/URL acquisition failed for "${file.name}":`, error);
                fileEntry.status = 'failed';
                fileEntry.originalUrl = FALLBACK_IMAGE_URL; // Use fallback on upload fail
                fileEntry.compressedUrl = FALLBACK_IMAGE_URL;
                updateImagePairResult(fileEntry);
            });

            newFilesPromises.push(fileEntry.uploadPromise.catch(e => null)); // Add to batch promises, catch errors so allSettled works
        });

        // Wait for all files to be read (successfully or not) before initiating compression
        await Promise.allSettled(newFilesPromises);
        console.log("[handleFiles] All file uploads (simulated) settled. Proceeding to initiateCompression.");
        initiateCompression(); // Always try to initiate compression after initial load phase
        updateCompressButtonState(); // Re-evaluate button state after initial load
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

    // --- compressImageClientSide function is now removed entirely ---

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
            
            createImagePairResult(fileEntry); 
        }

        const quality = currentQuality;
        const optimizeForWeb = optimizeForWebCheckbox.checked;
        const removeMetadata = removeMetadataCheckbox.checked;

        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileEntry = uploadedFiles[i];

            // Wait for originalUrl and compressedUrl to be ready (from simulated upload)
            try {
                await fileEntry.uploadPromise; 
                // Original and compressed URLs should be populated by now on fileEntry
                if (!fileEntry.originalUrl || !fileEntry.compressedUrl) {
                    throw new Error(`URLs not acquired after upload simulation for "${fileEntry.file.name}".`);
                }
            } catch (error) {
                console.error(`[initiateCompression] Failed to acquire URLs for "${fileEntry.file.name}":`, error);
                fileEntry.status = 'failed';
                // Original and compressed URLs might be null here, update with fallback
                fileEntry.originalUrl = FALLBACK_IMAGE_URL; 
                fileEntry.compressedUrl = FALLBACK_IMAGE_URL;
                updateImagePairResult(fileEntry);
                processedCount++;
                updateQueueProgress(processedCount, totalItems);
                continue; // Skip processing if URLs are not available
            }

            // Skip processing if file is already marked failed from earlier (e.g., upload failed)
            if (fileEntry.status === 'failed') {
                console.warn(`Skipping processing for "${fileEntry.file.name}" as it's already failed.`);
                processedCount++;
                updateQueueProgress(processedCount, totalItems);
                continue; // Move to next file
            }

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

                    if (optimizeForWeb) {
                        targetMinReduction += 0.02;
                        targetMaxReduction += 0.02;
                    }
                    if (removeMetadata) {
                        targetMinReduction += 0.01;
                        targetMaxReduction += 0.01;
                    }

                    targetMinReduction = Math.min(0.95, targetMinReduction);
                    targetMaxReduction = Math.min(0.98, targetMaxReduction);

                    const normalizedQuality = (quality - minAllowedQuality) / (maxAllowedQuality - minAllowedQuality);
                    const simulatedReductionRatio = targetMaxReduction - (normalizedQuality * (targetMaxReduction - targetMinReduction));
                    const simulatedCompressedSize = fileEntry.originalSize * (1 - simulatedReductionRatio);

                    fileEntry.compressedSize = Math.max(1, Math.round(simulatedCompressedSize));
                    // fileEntry.compressedUrl is already set by uploadPromise

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
    // This function now just sets up the dragging, not the initial display
    function setupImageComparisonSlider(container) {
        // Prevent re-initialization if already set up for this container
        if (container.dataset.sliderInitialized === 'true') {
            return; 
        }
        container.dataset.sliderInitialized = 'true'; // Mark as initialized

        const slider = container.querySelector('.img-comparison-slider');
        const afterImage = container.querySelector('.img-comparison-after'); // The div containing the compressed image
        const beforeImage = container.querySelector('.img-comparison-before'); // The div containing the original image
        const canvas = container.querySelector('.modal-canvas'); // Get the canvas element
        const ctx = canvas.getContext('2d');

        // Store references to the actual Image objects (not just URLs)
        // These will be loaded once when modal opens.
        let originalImageObj = new Image();
        let compressedImageObj = new Image();
        let imagesLoaded = false;

        // Load images for drawing on canvas
        const loadImagesForCanvas = (originalUrl, compressedUrl) => {
            return Promise.all([
                new Promise(resolve => { originalImageObj.onload = () => resolve(); originalImageObj.onerror = () => { console.error("Modal Original Image Load Fail"); originalImageObj.src = FALLBACK_IMAGE_URL; resolve(); }; originalImageObj.src = originalUrl; }),
                new Promise(resolve => { compressedImageObj.onload = () => resolve(); compressedImageObj.onerror = () => { console.error("Modal Compressed Image Load Fail"); compressedImageObj.src = FALLBACK_IMAGE_URL; resolve(); }; compressedImageObj.src = compressedUrl; })
            ]).then(() => {
                imagesLoaded = true;
                // Set canvas size based on original image for high quality drawing
                canvas.width = originalImageObj.naturalWidth;
                canvas.height = originalImageObj.naturalHeight;
                console.log(`[Modal Slider] Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
                drawComparison(canvas.width / 2); // Initial draw
            });
        };

        // This function draws the comparison onto the canvas
        const drawComparison = (sliderX) => {
            if (!imagesLoaded || !originalImageObj.naturalWidth || !compressedImageObj.naturalWidth) {
                // If images aren't loaded or have zero dimensions, draw a placeholder
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#666';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Loading Image...', canvas.width / 2, canvas.height / 2);
                return;
            }

            // Draw the full original image
            ctx.drawImage(originalImageObj, 0, 0, canvas.width, canvas.height);

            // Draw the compressed image, clipped to the right of the slider
            // Calculate source and destination rectangles for drawing
            const sourceX = sliderX;
            const sourceWidth = canvas.width - sliderX;
            const destX = sliderX;
            const destWidth = canvas.width - sliderX;

            if (sourceWidth > 0 && sourceX < canvas.width) {
                 ctx.drawImage(compressedImageObj, sourceX, 0, sourceWidth, canvas.height, // Source rectangle (from compressed image)
                               destX, 0, destWidth, canvas.height); // Destination rectangle (on visible canvas)
            }
        };

        let isDragging = false;

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

        // Initial draw (50% split)
        drawComparison(canvas.width / 2);

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
            e.preventDefault();
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
        
        // Setup slider (this will only set up event listeners and labels once)
        setupImageComparisonSlider(modalComparisonContainer); 

        // Load images for the canvas comparison
        try {
            await modalComparisonContainer.loadImage(fileEntry.originalUrl, fileEntry.compressedUrl);
            console.log(`[showModalComparison] Images loaded into modal canvases for "${fileEntry.file.name}".`);
            modalComparisonContainer.drawComparison(modalCanvas.width / 2); // Initial draw after images loaded
        } catch (error) {
            console.error(`[showModalComparison] Failed to load images for modal comparison for "${fileEntry.file.name}":`, error);
            // Draw error state on canvas
            modalCanvas.width = 600; // Default size
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
        // Images (modalOriginalImage, modalCompressedImage) stay loaded but cleared from canvas
        // This is efficient.
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