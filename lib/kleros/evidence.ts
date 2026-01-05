/**
 * Kleros evidence handling via IPFS
 * Evidence is stored on IPFS and referenced in disputes
 */

// Public IPFS gateways for reading
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

export interface EvidenceJSON {
  name: string;
  description: string;
  fileURI?: string;
  fileHash?: string;
  fileTypeExtension?: string;
}

/**
 * Create evidence JSON for Kleros
 */
export function createEvidenceJSON(
  name: string,
  description: string,
  fileURI?: string
): EvidenceJSON {
  const evidence: EvidenceJSON = {
    name,
    description,
  };

  if (fileURI) {
    evidence.fileURI = fileURI;
    // Extract extension from URI if possible
    const ext = fileURI.split('.').pop()?.toLowerCase();
    if (ext && ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'json'].includes(ext)) {
      evidence.fileTypeExtension = ext;
    }
  }

  return evidence;
}

/**
 * Upload evidence JSON to IPFS (via Pinata or similar)
 * Note: Requires PINATA_API_KEY in environment
 */
export async function uploadEvidenceToIPFS(evidence: EvidenceJSON): Promise<string | null> {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    console.warn('Pinata keys not configured, skipping IPFS upload');
    return null;
  }

  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: evidence,
        pinataMetadata: {
          name: `arc-invoice-evidence-${Date.now()}`,
        },
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to pin to IPFS');
    }

    const data = await res.json();
    return `ipfs://${data.IpfsHash}`;
  } catch (err) {
    console.error('IPFS upload error:', err);
    return null;
  }
}

/**
 * Convert IPFS URI to HTTP gateway URL
 */
export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }

  const cid = ipfsUri.replace('ipfs://', '');
  return `${IPFS_GATEWAYS[0]}${cid}`;
}

/**
 * Fetch evidence from IPFS
 */
export async function fetchEvidenceFromIPFS(ipfsUri: string): Promise<EvidenceJSON | null> {
  const httpUrl = ipfsToHttp(ipfsUri);

  try {
    const res = await fetch(httpUrl);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
