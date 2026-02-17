
import { GoogleGenAI } from "@google/genai";
import { School, SchoolStatus, AIIntelligenceReport } from "../types";

/**
 * Reliable wrapper for Gemini API calls to handle quota issues with retries.
 */
async function callGeminiReliably(params: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.status === 429;
      if (isQuotaError && i < retries - 1) {
        console.warn(`Vantage Point: Quota hit (429). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Fetches and parses spreadsheet data.
 */
export async function fetchSpreadsheetData(sheetId: string): Promise<School[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    const response = await fetch(url);
    const csvText = await response.text();
    
    const rows = csvText.split(/\r?\n/).map(row => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else current += char;
      }
      result.push(current.trim());
      return result;
    });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map((row, index) => {
      const getVal = (possibleHeaders: string[]) => {
        const idx = headers.findIndex(h => {
          const normalized = h.toLowerCase().trim();
          return possibleHeaders.some(p => {
            const target = p.toLowerCase().trim();
            return normalized === target || (normalized.length > 2 && normalized.includes(target));
          });
        });
        return idx !== -1 ? row[idx] : '';
      };

      const name = getVal(["Client's Name", "School Name", "Name", "Title"]);
      const address = getVal(["Address", "Street"]);
      const city = getVal(["City"]);
      const state = getVal(["State", "Province"]);
      const zip = getVal(["Zip", "Postal", "Zipcode"]);
      const notes = getVal(["Strategic Notes", "Notes", "Comment"]);
      const progress = getVal(["School Success Maker Progress", "Progress", "Status Progress"]);
      const latRaw = getVal(["Latitude", "Lat", "Latitude Coordinate"]);
      const lngRaw = getVal(["Longitude", "Long", "Lng", "Longitude Coordinate"]);
      const website = getVal(["Website", "URL", "Link"]);
      const typeStr = getVal(["Status", "Type"]) || "Prospect";
      const tracker = getVal(["Success Tracker", "Tracker"]);
      const lastAction = getVal(["Last Action Date", "Date"]);
      const contact = getVal(["Contact Name", "Primary Contact", "Principal", "Head of School"]);
      const image = getVal(["Campus Image", "Image URL", "Photo"]);

      const parseCoord = (val: string) => {
        if (!val) return undefined;
        const cleaned = val.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
      };

      const lat = parseCoord(latRaw);
      const lng = parseCoord(lngRaw);

      const statusMap: Record<string, SchoolStatus> = {
        'managed': SchoolStatus.CLIENT,
        'client': SchoolStatus.CLIENT,
        'prospect': SchoolStatus.PROSPECT,
        'partner': SchoolStatus.PARTNER
      };

      return {
        id: `school-${index}-${Date.now()}`,
        name: name || `Entry ${index + 1}`,
        strategicNotes: notes || '',
        status: statusMap[typeStr.toLowerCase()] || SchoolStatus.PROSPECT,
        state: state || '',
        successMakerStatus: progress || 'Not Started',
        successTracker: tracker || '',
        lastActionDate: lastAction || '',
        latitude: lat,
        longitude: lng,
        contactName: contact || undefined,
        campusImage: image || undefined,
        enriched: {
          address: `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${zip ? ' ' + zip : ''}`,
          city,
          state,
          zip,
          lat,
          lng,
          website: website || undefined
        }
      } as School;
    }).filter(s => s.name && s.name !== "Client's Name" && s.name.length > 0);
  } catch (error) {
    console.error("Failed to fetch spreadsheet:", error);
    return [];
  }
}

/**
 * Searches for schools globally using Google Maps grounding.
 */
export async function searchExternalSchools(query: string): Promise<School[]> {
  const prompt = `Find educational institutions and schools matching the query: "${query}". Return their names, addresses, and approximate locations.`;
  
  try {
    const response = await callGeminiReliably({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const results: School[] = [];

    chunks.forEach((chunk: any, index: number) => {
      if (chunk.maps) {
        results.push({
          id: `ext-${index}-${Date.now()}`,
          name: chunk.maps.title || "External School",
          isExternal: true,
          status: SchoolStatus.PROSPECT,
          successMakerStatus: 'Discovered',
          strategicNotes: 'Found via global search. Awaiting audit.',
          enriched: {
            address: chunk.maps.title || 'Location details in link',
            website: chunk.maps.uri
          },
          latitude: 37 + (Math.random() - 0.5) * 15, 
          longitude: -95 + (Math.random() - 0.5) * 30
        });
      }
    });

    return results;
  } catch (error) {
    console.error("External search failed:", error);
    return [];
  }
}

/**
 * Uses Gemini Flash for high-speed, stable intelligence generation.
 */
export async function generateSchoolIntelligence(school: School): Promise<AIIntelligenceReport> {
  const prompt = `Act as an expert "School Success" consultant. 
    Perform a high-level strategic intelligence audit for the following school:
    Name: ${school.name}
    Location: ${school.enriched?.address}
    
    Research and provide:
    1. A concise executive summary focusing on current enrollment health.
    2. Market positioning relative to local competitors.
    3. Recent community sentiment or news.
    4. EXACTLY 3 unique, real-time strategic growth recommendations focusing on enrollment differentiation. 
    
    Ensure recommendations are tactical and location-aware.`;

  try {
    const response = await callGeminiReliably({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Unable to generate intelligence.";
    const sections = text.split(/\d\./);
    
    return {
      summary: sections[1]?.trim() || text,
      marketPosition: sections[2]?.trim() || "Information unavailable.",
      recentNews: sections[3]?.split('\n').filter(l => l.trim()).map(l => l.replace(/^[*-]\s*/, '')) || [],
      strategicAdvice: sections[4]?.trim() || "Continue monitoring market trends.",
      sources: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .filter((c: any) => c.web)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri })),
    };
  } catch (error) {
    console.error("Consultant intelligence failed:", error);
    throw error;
  }
}

/**
 * Generates a Highly Personalized Executive Brief Proposal (StoryBrand).
 */
export async function generateOutreachBrief(school: School): Promise<string> {
  const salutationLine = school.contactName 
    ? `Dear ${school.contactName},` 
    : `Dear ${school.name} Leadership,`;

  const prompt = `Act as Mitchell Slater, CEO of School Success. Draft a High-Stakes Personalization Email Brief for the following school:
    Name: ${school.name}
    City: ${school.enriched?.city || 'your city'}
    Zip: ${school.enriched?.zip || 'your area'}
    Contact: ${school.contactName || 'Leadership'}

    Tone: Executive, direct, and tactical. No fluff. No icons. No emojis.
    Model: Gemini 1.5 Flash Speed.

    Requirements:
    - Subject: Strategic Growth Plan: ${school.name}
    - Salutation: ${salutationLine}
    - The Challenge (Executive Audit): Reference ${school.name}'s specific city of ${school.enriched?.city || 'the local market'}. Mention that the ${school.enriched?.city || 'area'} market is competitive and that relying on passive marketing puts ${school.name} at risk of losing families to centers with smoother inquiry processes.
    - The Guide: "At School Success, we provide the tactical framework and technical infrastructure necessary to stabilize your pipeline and dominate your local territory."
    - The Growth Plan (Strategic Levers):Solution to the problems identified in the Audit.
      1. Vantage Point Audit: We pinpoint your best-fit family clusters within your specific geographic radius.
      2. Zenrollment Setup: We remove the friction from your digital funnel to maximize lead conversion.
      3. Scale: We automate your growth engine so you can focus on high-level leadership.
    - The Stakes: A brief, compelling sentence on why ${school.name} needs to act now to remain the premier choice in ${school.enriched?.city || 'the region'}.
    - The CTA: "Feel free to reply or book a time that works for you here: Book a Strategy Session"
    - Signature:
      Mitchell Slater
      CEO, School Success`;

  try {
    const response = await callGeminiReliably({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    return response.text || "Outreach brief generation failed.";
  } catch (error) {
    console.error("Outreach brief generation failed:", error);
    throw error;
  }
}

/**
 * Simulates updating the CRM (Google Sheet).
 */
export async function updateCRMStatus(school: School): Promise<{ successTracker: string; lastActionDate: string }> {
  const date = new Date().toLocaleDateString();
  const status = "Proposal Copied";
  await new Promise(r => setTimeout(r, 600));
  return {
    successTracker: status,
    lastActionDate: date
  };
}

export async function sendEmailBrief(school: School, content: string, email: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 800));
  return true;
}
