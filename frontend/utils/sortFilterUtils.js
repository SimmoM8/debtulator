


export function sortList(data, sortOption, ascending, sortFns) {
    if (!Array.isArray(data)) return [];
    let sorted = [...data];
    const sortFn = sortFns[sortOption];
    if (typeof sortFn === 'function') {
        sorted.sort(sortFn);
    }
    if (ascending) {
        sorted.reverse();
    }
    return sorted;
}

export function filterList(data, filterOption, filterFns) {
    if (!Array.isArray(data)) return [];
    const filterFn = filterFns[filterOption];
    if (typeof filterFn === 'function') {
        return data.filter(filterFn);
    }
    return data;
}