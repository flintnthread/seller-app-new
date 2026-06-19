import { apiRequest } from "@/lib/api/client";

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
};

export type AddressLocationValue = {
    country: string;
    state: string;
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

export async function fetchCountries(search?: string): Promise<LocationItem[]> {
    return apiRequest<LocationItem[]>(withQuery("/api/locations/countries", { search }));
}

export async function fetchStates(countryId?: number, search?: string): Promise<LocationItem[]> {
    return apiRequest<LocationItem[]>(withQuery("/api/locations/states", { countryId, search }));
}

export async function fetchCities(stateId?: number, search?: string): Promise<LocationItem[]> {
    return apiRequest<LocationItem[]>(withQuery("/api/locations/cities", { stateId, search }));
}

export async function fetchAreas(cityId?: number, search?: string): Promise<LocationItem[]> {
    return apiRequest<LocationItem[]>(withQuery("/api/locations/areas", { cityId, search }));
}

export async function fetchPincodes(areaId?: number, search?: string): Promise<LocationItem[]> {
    return apiRequest<LocationItem[]>(withQuery("/api/locations/pincodes", { areaId, search }));
}

export async function searchLocations(q: string, country?: string): Promise<LocationSearchResult[]> {
    return apiRequest<LocationSearchResult[]>(withQuery("/api/locations/search", { q, country }));
}

export type CreateLocationPayload = {
    country: string;
    state: string;
    city: string;
    area: string;
    pincode: string;
};

/** Save a new location to the database when it is not found by search. */
export async function saveLocation(payload: CreateLocationPayload): Promise<LocationSearchResult> {
    return apiRequest<LocationSearchResult>("/api/locations", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function resolveLocationIds(value: AddressLocationValue): Promise<{
    countryId?: number;
    stateId?: number;
    cityId?: number;
    areaId?: number;
    pincodeId?: number;
}> {
    const result: {
        countryId?: number;
        stateId?: number;
        cityId?: number;
        areaId?: number;
        pincodeId?: number;
    } = {};

    if (!value.country.trim()) return result;

    const countries = await fetchCountries();
    const country = countries.find((c) => c.name.toLowerCase() === value.country.trim().toLowerCase());
    if (!country) return result;
    result.countryId = country.id;

    if (!value.state.trim()) return result;
    const states = await fetchStates(country.id);
    const state = states.find((s) => s.name.toLowerCase() === value.state.trim().toLowerCase());
    if (!state) return result;
    result.stateId = state.id;

    if (!value.city.trim()) return result;
    const cities = await fetchCities(state.id);
    const city = cities.find((c) => c.name.toLowerCase() === value.city.trim().toLowerCase());
    if (!city) return result;
    result.cityId = city.id;

    if (!value.area.trim()) return result;
    const areas = await fetchAreas(city.id);
    const area = areas.find((a) => a.name.toLowerCase() === value.area.trim().toLowerCase());
    if (!area) return result;
    result.areaId = area.id;

    if (!value.pincode.trim()) return result;
    const pincodes = await fetchPincodes(area.id);
    const pincode = pincodes.find((p) => p.name === value.pincode.trim());
    if (pincode) result.pincodeId = pincode.id;

    return result;
}
