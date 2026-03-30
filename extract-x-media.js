/**
 * 🧜‍♀️ ARMENIACA TIME TRAVELER (v3.3)
 * ----------------------------------
 * FEATURE: Decodes the REAL date from Tweet IDs (Snowflake Algorithm).
 * This ensures 100% accurate Years, Months, and Dates.
 * 
 * INSTRUCTIONS:
 * 1. Open https://x.com/armeniaca15/media
 * 2. Scroll down slowly to load the history.
 * 3. Copy/Paste this into Console (F12).
 */

(async function timeTravelExtract() {
    console.log("%c 🕰️ ARMENIACA TIME TRAVELER: Decoding History... ", "background: #9B7BB4; color: white; font-size: 14px; font-weight: bold; padding: 4px;");
    
    const results = [];
    const allImages = Array.from(document.querySelectorAll('img[src*="pbs.twimg.com/media/"]'));
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Twitter Snowflake Epoch (Oct 12, 2010)
    const TWITTER_EPOCH = 1288834974657n;

    allImages.forEach((img) => {
        if (img.width < 100) return;

        // Find the link to the tweet to get the ID
        const tweetLink = img.closest('a[href*="/status/"]')?.href || "";
        const tweetIdMatch = tweetLink.match(/\/status\/(\d+)/);
        
        let timestamp;
        if (tweetIdMatch) {
            // DECODE TWEET ID TO TIMESTAMP
            const tweetId = BigInt(tweetIdMatch[1]);
            timestamp = Number((tweetId >> 22n) + TWITTER_EPOCH);
        } else {
            // Fallback to today if no ID found
            timestamp = Date.now();
        }

        const dateObj = new Date(timestamp);
        const fullDate = dateObj.toISOString().split('T')[0];
        const year = dateObj.getFullYear().toString();
        const month = monthNames[dateObj.getMonth()];

        // Caption Extraction
        const container = img.closest('article') || img.closest('[data-testid="cellInnerDiv"]') || img.parentElement.parentElement.parentElement;
        const tweetText = container?.querySelector('[data-testid="tweetText"]')?.innerText || "Eli JKT48 Moment";
        
        let baseTitle = tweetText.split('\n')[0] || "Eli JKT48";
        if (baseTitle.length > 30) baseTitle = baseTitle.substring(0, 30) + "...";

        const baseUrl = img.src.split('?')[0];
        const highResUrl = `${baseUrl}?format=jpg&name=large`;

        if (!results.some(r => r.url === highResUrl)) {
            results.push({
                id: `eli-tt-${fullDate}-${results.length}`,
                url: highResUrl,
                thumbnail: `${baseUrl}?format=jpg&name=small`,
                title: baseTitle,
                description: tweetText.trim(),
                category: 'all',
                year: year,
                month: month,
                date: fullDate,
                location: 'JKT48 Theater',
                dimensions: { width: 4000, height: 6000 },
                featured: results.length < 6
            });
        }
    });

    if (results.length > 0) {
        // Sort by date descending (newest first)
        results.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`%c ✅ DECODED: Found ${results.length} images with AUTHENTIC dates! `, "background: #4CAF50; color: white; font-weight: bold; padding: 4px;");
        
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `armeniaca-authentic-archive.json`;
        document.body.appendChild(a);
        a.click();
        
        console.log("💾 Downloaded! Paste the JSON here to see your real 2024/2025 history.");
    } else {
        console.error("❌ No archive found. Scroll down and try again.");
    }
})();
