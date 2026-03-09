import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgb(22, 93, 89) 0%, rgb(15, 67, 64) 100%)",
          color: "white",
          fontSize: 164,
          fontWeight: 700,
          letterSpacing: -10,
        }}
      >
        FG
      </div>
    ),
    size,
  );
}
