const fs = require('fs');
const path = require('path');

let adminUnitsList = [];

try {
  const filePath = path.join(__dirname, '../data/vietnameseProvinces.json');
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    // Flatten provinces, districts, wards
    data.forEach(prov => {
      adminUnitsList.push({
        name: prov.FullName || prov.Name,
        type: 'province',
        code: prov.Code,
        province: prov.Name,
        display_name: `${prov.FullName}, Việt Nam`
      });

      if (prov.Districts && Array.isArray(prov.Districts)) {
        prov.Districts.forEach(dist => {
          adminUnitsList.push({
            name: dist.FullName || dist.Name,
            type: 'district',
            code: dist.Code,
            province: prov.Name,
            display_name: `${dist.FullName}, ${prov.FullName}, Việt Nam`
          });

          if (dist.Wards && Array.isArray(dist.Wards)) {
            dist.Wards.forEach(ward => {
              adminUnitsList.push({
                name: ward.FullName || ward.Name,
                type: 'ward',
                code: ward.Code,
                province: prov.Name,
                display_name: `${ward.FullName}, ${dist.FullName}, ${prov.FullName}, Việt Nam`
              });
            });
          }
        });
      } else if (prov.Wards && Array.isArray(prov.Wards)) {
        prov.Wards.forEach(ward => {
          adminUnitsList.push({
            name: ward.FullName || ward.Name,
            type: 'ward',
            code: ward.Code,
            province: prov.Name,
            display_name: `${ward.FullName}, ${prov.FullName}, Việt Nam`
          });
        });
      }
    });
  }
} catch (err) {
  console.warn('[AdministrativeUnits] Could not load JSON dataset:', err.message);
}

const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

/**
 * Tìm kiếm đơn vị hành chính Việt Nam (Tỉnh, Quận/Huyện, Phường/Xã) theo từ khóa
 */
const searchAdministrativeUnits = (query, limit = 5) => {
  if (!query || !query.trim()) return [];
  const normQuery = removeVietnameseTones(query);

  const matched = [];
  for (const item of adminUnitsList) {
    const normName = removeVietnameseTones(item.display_name);
    if (normName.includes(normQuery)) {
      matched.push({
        display_name: item.display_name,
        lat: '0', // coordinates dynamically resolved by OpenStreetMap Nominatim or Viettel Maps
        lon: '0',
        type: item.type
      });
      if (matched.length >= limit) break;
    }
  }

  return matched;
};

module.exports = {
  searchAdministrativeUnits,
  adminUnitsList
};
