import { ImageResponse } from "next/og";

export const alt = "Ad-Nav | Adam Stacey";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #b829e3, #ff2d95, #00f0ff)",
          }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#b829e3",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          Ad-Nav
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#e0e0e0",
            marginBottom: 8,
          }}
        >
          Adam Stacey
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#8a8a9a",
          }}
        >
          Mapping Success for Teams, Technology, and Transformation
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #00f0ff, #ff2d95, #b829e3)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
