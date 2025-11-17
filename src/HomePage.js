import UserMenu from "./UserMenu";

function HomePage() {
  return (
    <div style={{ padding: "20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Bienvenue sur le tournoi</h1>
        <UserMenu />
      </header>

      <main style={{ marginTop: "40px" }}>
        <p>Accédez aux combats et informations ici...</p>
      </main>
    </div>
  );
}

export default HomePage;
