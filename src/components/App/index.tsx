import { useInterval } from "usehooks-ts";
import Page from "@/components/App/Page";
import Container from "@/components/App/Container";
import Header from "@/components/App/Header";
import Logo from "@/components/Logo";
import Insights from "@/components/Insights";
import Content from "@/components/App/Content";
import Study from "@/components/Study";
import Footer from "@/components/App/Footer";
import ThemeToggle from "@/components/Theme/Toggle";
import useForceUpdate from "@/hooks/useForceUpdate";

const App = () => {
  const forceUpdate = useForceUpdate();
  useInterval(forceUpdate, 3000);

  return (
    <Page>
      <Container>
        <Header>
          <Logo>Improve your English with spaced repetition.</Logo>
          <Insights />
        </Header>
        <Content>
          <Study />
        </Content>
        <Footer>
          <ThemeToggle />
        </Footer>
      </Container>
    </Page>
  );
};

export default App;
