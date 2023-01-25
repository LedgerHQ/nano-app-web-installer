import axios from "axios";

export const appsList = async () => {
  const { data } = await axios({
    method: "GET",
    url: "https://manager.api.live.ledger.com/api/applications",
  });

  if (!data || !Array.isArray(data)) {
    throw new Error("Down");
  }

  return data;
};
