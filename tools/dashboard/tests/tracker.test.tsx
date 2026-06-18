// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, screen, act } from "@testing-library/react";
import Tracker from "../src/views/Tracker.js";
import { renderAt, mockFetch } from "./helpers.js";
import { JOBS, TIMELINE } from "./fixtures.js";

const ROUTES = {
  "GET /api/jobs": JOBS,
  "GET /api/timeline": TIMELINE,
  "POST /api/jobs/acme-robot-dev/app-status": { ok: true },
  "POST /api/jobs/acme-robot-dev/note": { ok: true },
  "POST /api/jobs/beta-firmware-eng/app-status": { ok: true },
};

describe("Tracker", () => {
  it("renders all 5 columns with grouped cards", async () => {
    mockFetch(ROUTES);
    renderAt(<Tracker />);

    // JOB_A is in "applied" column
    expect(await screen.findByTestId("card-acme-robot-dev")).toBeTruthy();
    // JOB_B is in "rejected" column
    expect(screen.getByTestId("card-beta-firmware-eng")).toBeTruthy();

    // All 5 column headings present
    for (const col of ["interested", "applied", "interview", "offer", "rejected"]) {
      expect(screen.getByRole("heading", { name: new RegExp(col, "i") })).toBeTruthy();
    }
  });

  it("shows the rejected job's stage chip", async () => {
    mockFetch(ROUTES);
    renderAt(<Tracker />);
    await screen.findByTestId("card-beta-firmware-eng");
    // JOB_B has rejection-stage: "screening" — shown as chip and/or in postmortem
    expect(screen.getAllByText(/screening/i).length).toBeGreaterThan(0);
  });

  it("opens rejection modal when a card is dropped into the Rejected column", async () => {
    mockFetch(ROUTES);
    renderAt(<Tracker />);

    const card = await screen.findByTestId("card-acme-robot-dev");
    const rejCol = screen.getByTestId("col-rejected");

    await act(async () => {
      fireEvent.dragStart(card);
    });
    await act(async () => {
      fireEvent.dragOver(rejCol);
    });
    await act(async () => {
      fireEvent.drop(rejCol);
    });

    // The "Log a rejection" modal should appear
    expect(screen.getByText(/log a rejection/i)).toBeTruthy();
  });

  it("posts rejected status with stage+reason when modal is confirmed", async () => {
    const fn = mockFetch(ROUTES);
    renderAt(<Tracker />);

    const card = await screen.findByTestId("card-acme-robot-dev");
    const rejCol = screen.getByTestId("col-rejected");

    await act(async () => { fireEvent.dragStart(card); });
    await act(async () => { fireEvent.dragOver(rejCol); });
    await act(async () => { fireEvent.drop(rejCol); });

    // Modal open — confirm
    const confirmBtn = screen.getByText(/mark as rejected/i);
    await act(async () => { fireEvent.click(confirmBtn); });

    // Check that fetch was called with POST /api/jobs/acme-robot-dev/app-status
    const postCall = fn.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/api/jobs/acme-robot-dev/app-status") &&
        init?.method === "POST",
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1].body as string);
    expect(body.status).toBe("rejected");
    // Stage must be a valid REJECTION_STAGES enum value
    const VALID_STAGES = ["screening", "oa", "phone", "onsite", "offer-declined"];
    expect(VALID_STAGES).toContain(body.rejectionStage);
  });

  it("shows Offer logged celebration when a card is dropped into Offer column", async () => {
    mockFetch({ ...ROUTES, "POST /api/jobs/acme-robot-dev/app-status": { ok: true } });
    renderAt(<Tracker />);

    const card = await screen.findByTestId("card-acme-robot-dev");
    const offerCol = screen.getByTestId("col-offer");

    await act(async () => { fireEvent.dragStart(card); });
    await act(async () => { fireEvent.dragOver(offerCol); });
    await act(async () => { fireEvent.drop(offerCol); });

    expect(screen.getByText(/offer logged/i)).toBeTruthy();
  });

  it("posts a quick note via the note input", async () => {
    const fn = mockFetch(ROUTES);
    renderAt(<Tracker />);
    await screen.findByTestId("card-acme-robot-dev");

    fireEvent.change(screen.getByLabelText("note-acme-robot-dev"), {
      target: { value: "called them" },
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("addnote-acme-robot-dev"));
    });

    expect(
      fn.mock.calls.some(
        ([url, init]) =>
          String(url).includes("/note") && init?.method === "POST",
      ),
    ).toBe(true);
  });

  it("shows postmortem breakdown from rejected jobs", async () => {
    mockFetch(ROUTES);
    renderAt(<Tracker />);
    // JOB_B rejected at screening → screening: 100%
    expect(await screen.findByText(/screening: 100%/)).toBeTruthy();
  });
});
