const registrationUrl = "https://tr.ee/Cybersecurity_workshop";

export function WorkshopRegistrationLink() {
  return (
    <p className="workshop-register">
      You can join our cybersecurity workshop using the{" "}
      <a href={registrationUrl} target="_blank" rel="noopener noreferrer">registration link</a>.
    </p>
  );
}
