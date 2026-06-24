import { resolveApiBaseUrl } from "@/lib/api/config";

export type LocationItem = {
    id: number;
    name: string;
    parentId?: number | null;
    parentName?: string | null;
};

export type LocationSearchResult = {
    pincodeId: number;
    pincode: string;
    areaId: number;
    area: string;
    cityId: number;
    city: string;
    stateId: number;
    state: string;
    countryId: number;
    country: string;
    /** From OpenStreetMap when not yet in local DB */
    external?: boolean;
    externalId?: string;
    displayName?: string;
    /** District e.g. Palnadu */
    district?: string;
    /** Mandal / taluk for suggestion subtitle */
    mandal?: string;
    /** Coordinates for Maps-style place details on select */
    latitude?: number;
    longitude?: number;
};

export type AddressLocationValue = {
    country: string;
    state: string;
    /** District name stored in cities table (e.g. Palnadu). */
    city: string;
    area: string;
    pincode: string;
};

function withQuery(base: string, params: Record<string, string | number | undefined | null>): string {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
    return qs ? `${base}?${qs}` : base;
}

/** Public read-only location APIs (no auth required). */
async function publicLocationRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    let res: Response;
    try {
        res = await fetch(url, {
            ...init,
            headers: {
                Accept: "application/json",
                ...(init?.body ? { "Content-Type": "application/json" } : {}),
                ...(init?.headers as Record<string, string> | undefined),
            },
        });
    } catch {
        throw new Error(`Cannot reach API at ${baseUrl}. Ensure the seller backend is running.`);
    }
    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch {
            // ignore
        }
        throw new Error(message);
    }
    return res.json() as Promise<T>;
}

export async function fetchCountries(search?: string): Promise<LocationItem[]> {
    return publicLocationRequest<LocationItem[]>(withQuery("/api/locations/countries", { search }));
}

export async function fetchStates(countryId?: number, search?: string): Promise<LocationItem[]> {
    return publicLocationRequest<LocationItem[]>(withQuery("/api/locations/states", { countryId, search }));
}

export async function fetchCities(stateId?: number, search?: string): Promise<LocationItem[]> {
    return publicLocationRequest<LocationItem[]>(withQuery("/api/locations/cities", { stateId, search }));
}

export async function fetchAreas(cityId?: number, search?: string): Promise<LocationItem[]> {
    return publicLocationRequest<LocationItem[]>(withQuery("/api/locations/areas", { cityId, search }));
}

export async function fetchPincodes(areaId?: number, search?: string): Promise<LocationItem[]> {
    return publicLocationRequest<LocationItem[]>(withQuery("/api/locations/pincodes", { areaId, search }));
}

export async function searchLocations(q: string, country?: string): Promise<LocationSearchResult[]> {
    return publicLocationRequest<LocationSearchResult[]>(withQuery("/api/locations/search", { q, country }));
}

/** Google Maps-style place details — full address from map coordinates. */
export async function resolvePlace(lat: number, lon: number): Promise<LocationSearchResult> {
    return publicLocationRequest<LocationSearchResult>(
        withQuery("/api/locations/place", { lat, lon }),
    );
}

/** Resolve missing pincode for an external map suggestion (India Post lookup). */
export async function enrichLocationSearch(item: LocationSearchResult): Promise<LocationSearchResult> {
    return publicLocationRequest<LocationSearchResult>("/api/locations/enrich", {
        method: "POST",
        body: JSON.stringify(item),
    });
}

export type CreateLocationPayload = {
    country: string;
    state: string;
    city: string;
    area: string;
    /** Omit or leave empty to save country → area only (pincode added later). */
    pincode?: string;
};

/** Save a new location to the database when it is not found by search. */
export async function saveLocation(payload: CreateLocationPayload): Promise<LocationSearchResult> {
    return publicLocationRequest<LocationSearchResult>("/api/locations", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export type AddPincodePayload = {
    areaId: number;
    pincode: string;
};

/** Add a new pincode to an existing area in the database. */
export async function addPincode(payload: AddPincodePayload): Promise<LocationItem> {
    return publicLocationRequest<LocationItem>("/api/locations/pincodes", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/** Resolve hierarchy IDs and backfill pincode from the pincodes table when missing. */
export async function resolveLocation(value: AddressLocationValue): Promise<LocationSearchResult | null> {
    if (!value.country.trim()) return null;
    return publicLocationRequest<LocationSearchResult>(
        withQuery("/api/locations/resolve", {
            country: value.country.trim(),
            state: value.state.trim() || undefined,
            city: value.city.trim() || undefined,
            area: value.area.trim() || undefined,
            pincode: value.pincode.trim() || undefined,
        }),
    );
}

export async function resolveLocationIds(value: AddressLocationValue): Promise<{
    countryId?: number;
    stateId?: number;
    cityId?: number;
    areaId?: number;
    pincodeId?: number;
    pincode?: string;
}> {
    try {
        const resolved = await resolveLocation(value);
        if (!resolved) return {};

        const result: {
            countryId?: number;
            stateId?: number;
            cityId?: number;
            areaId?: number;
            pincodeId?: number;
            pincode?: string;
        } = {};

        if (resolved.countryId > 0) result.countryId = resolved.countryId;
        if (resolved.stateId > 0) result.stateId = resolved.stateId;
        if (resolved.cityId > 0) result.cityId = resolved.cityId;
        if (resolved.areaId > 0) result.areaId = resolved.areaId;
        if (resolved.pincodeId > 0) result.pincodeId = resolved.pincodeId;
        if (resolved.pincode) result.pincode = resolved.pincode;

        return result;
    } catch {
        return {};
    }
}
