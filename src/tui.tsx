import { Plugin } from "@opencode/plugin/tui";
import { formatCost, formatPercent, formatTokens } from "./format.ts";
import { cacheHitRate, contextUsage, latestReply } from "./metrics.ts";

function Section(props: { context: Plugin.Context; sessionID: string }) {
  const context = props.context;
  const session = () => context.data.session.get(props.sessionID);
  const messages = () => context.data.session.message.list(props.sessionID);
  const models = () => context.data.location.model.list(session()?.location) ?? [];
  const reply = () => latestReply(messages(), session()?.revert?.messageID);

  const usage = () => {
    const latest = reply();
    return latest ? contextUsage(latest, models()) : undefined;
  };
  const cache = () => {
    const latest = reply();
    return latest ? cacheHitRate(latest) : null;
  };
  const cost = () => context.data.session.cost(props.sessionID);

  const line = (text: string) => <text fg={context.theme.text.muted}>{text}</text>;

  return (
    <>
      {usage() || cost() > 0 ? (
        <box>
          <text fg={context.theme.text.base}>
            <b>Context</b>
          </text>
          {usage() ? line(`${formatTokens(usage()!.tokens)} tokens`) : null}
          {usage()?.percent !== undefined ? line(`${formatPercent(usage()!.percent!)} used`) : null}
          {cache() !== null ? line(`${formatPercent(cache()!)} cache hit rate`) : null}
          {cost() > 0 ? line(`${formatCost(cost())} spent`) : null}
        </box>
      ) : null}
    </>
  );
}

export default Plugin.define({
  id: "tomdewildt.sidebar.context",
  setup(context) {
    return context.ui.slot({
      prepend: "sidebar.content",
      render: (input) => <Section context={context} sessionID={input.sessionID} />,
    });
  },
});
