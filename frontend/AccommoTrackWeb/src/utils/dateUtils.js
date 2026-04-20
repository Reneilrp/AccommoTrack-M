export const parseIsoDateOnly = (value) => {
  const trimmed = String(value || "").trim();
  const matches = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matches) return null;

  const year = Number(matches[1]);
  const month = Number(matches[2]);
  const day = Number(matches[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const getAgeInYears = (dateOfBirth, referenceDate = new Date()) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const ref = new Date(referenceDate);
  if (Number.isNaN(dob.getTime())) return null;

  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount || 0);
};

export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
